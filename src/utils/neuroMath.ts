import type {
  AssessmentRecord,
  AssessmentStatus,
  DeviceState,
  NerveBaseline,
  PreCheckResult,
  ThresholdConfig,
} from '../types/clinical';

export const TEMP_OPTIMAL_MIN_C = 32.0;
export const TEMP_CORRECTION_SLOPE = 1.8; // m/s per °C below reference
export const IMPEDANCE_MAX_KOHM = 10.0;
export const IMU_MAX_STILLNESS_G = 0.05;
export const INTER_RECORDING_DISTANCE_MM = 30;

/**
 * Computes conduction velocity (m/s) from inter-electrode distance (mm) and latency delta (ms).
 * Since mm / ms === m / s, CV = Δd_mm / Δt_ms.
 */
export function calculateNCV(distanceMm: number, deltaTMs: number): number {
  if (distanceMm <= 0 || deltaTMs <= 0) {
    return 0;
  }
  return Number((distanceMm / deltaTMs).toFixed(1));
}

/**
 * Applies TMP117 cutaneous temperature normalization (+1.8 m/s per °C below 32.0°C).
 */
export function applyTemperatureCorrection(
  rawNcv: number,
  skinTempC: number,
  targetTempC: number = TEMP_OPTIMAL_MIN_C,
  slopePerC: number = TEMP_CORRECTION_SLOPE
): { correctedNcv: number; appliedOffset: number; isActive: boolean } {
  if (skinTempC >= targetTempC) {
    return {
      correctedNcv: Number(rawNcv.toFixed(1)),
      appliedOffset: 0,
      isActive: false,
    };
  }
  const deltaC = targetTempC - skinTempC;
  const offset = deltaC * slopePerC;
  return {
    correctedNcv: Number((rawNcv + offset).toFixed(1)),
    appliedOffset: Number(offset.toFixed(1)),
    isActive: true,
  };
}

/**
 * Computes percentage change relative to a personal baseline (negative = reduction).
 */
export function calculatePercentChange(current: number, baseline: number): number {
  if (baseline <= 0) return 0;
  return Number((((current - baseline) / baseline) * 100).toFixed(1));
}

/**
 * Evaluates whether a clinical record triggers a threshold alert against the supervised baseline.
 */
export function evaluateAlertStatus(
  record: Pick<AssessmentRecord, 'ncv' | 'amplitude'>,
  baseline: Pick<NerveBaseline, 'ncv' | 'amplitude'>,
  thresholds: ThresholdConfig
): {
  status: AssessmentStatus;
  cvChangePct: number;
  ampChangePct: number;
  cvAlertTriggered: boolean;
  ampAlertTriggered: boolean;
} {
  const cvChangePct = calculatePercentChange(record.ncv, baseline.ncv);
  const ampChangePct = calculatePercentChange(record.amplitude, baseline.amplitude);

  const cvDrop = -cvChangePct;
  const ampDrop = -ampChangePct;

  const cvAlertTriggered = cvDrop >= thresholds.cvReductionAlertPct;
  const ampAlertTriggered = ampDrop >= thresholds.ampReductionAlertPct;

  let status: AssessmentStatus = 'nominal';
  if (cvAlertTriggered || ampAlertTriggered) {
    status = 'alert';
  } else if (
    cvDrop >= thresholds.cvReductionAlertPct * 0.6 ||
    ampDrop >= thresholds.ampReductionAlertPct * 0.6
  ) {
    status = 'watch';
  }

  return {
    status,
    cvChangePct,
    ampChangePct,
    cvAlertTriggered,
    ampAlertTriggered,
  };
}

/**
 * Runs automated hardware safety and signal quality pre-checks from Device & BLE Bridge state.
 */
export function evaluatePreChecks(device: DeviceState): {
  allPassed: boolean;
  checks: PreCheckResult[];
} {
  const impedancePassed = device.connected && device.impedanceKOhm < IMPEDANCE_MAX_KOHM;
  const tempPassed = device.connected && device.skinTempC >= TEMP_OPTIMAL_MIN_C;
  const imuPassed = device.connected && device.imuMotionG < IMU_MAX_STILLNESS_G;
  const chargingPassed = device.connected && !device.chargingInterlock;

  const checks: PreCheckResult[] = [
    {
      key: 'impedance',
      label: 'Skin-Electrode Impedance',
      requirement: `< ${IMPEDANCE_MAX_KOHM.toFixed(1)} kΩ`,
      valueDisplay: `${device.impedanceKOhm.toFixed(1)} kΩ`,
      passed: impedancePassed,
      detail: impedancePassed
        ? 'Contact gel integrity optimal for low-noise INA333 acquisition.'
        : 'High skin impedance detected. Clean skin with alcohol swab and re-seat hydrogel pads.',
    },
    {
      key: 'temperature',
      label: 'Cutaneous Temp (TMP117)',
      requirement: `≥ ${TEMP_OPTIMAL_MIN_C.toFixed(1)} °C`,
      valueDisplay: `${device.skinTempC.toFixed(1)} °C`,
      passed: tempPassed,
      detail: tempPassed
        ? 'Limb temperature within optimal physiological range.'
        : `Skin temperature below 32.0°C (+1.8 m/s/°C cold slowdown). Warm extremity before acquisition.`,
    },
    {
      key: 'imu',
      label: 'IMU Motion Stillness',
      requirement: `< ${IMU_MAX_STILLNESS_G.toFixed(2)} g`,
      valueDisplay: `${device.imuMotionG.toFixed(3)} g`,
      passed: imuPassed,
      detail: imuPassed
        ? 'Limb stationary. Motion artifact rejection nominal.'
        : 'Excessive limb movement detected by onboard IMU. Rest foot/arm flat on support.',
    },
    {
      key: 'charging',
      label: 'Charging Safety Interlock',
      requirement: 'USB-C / Qi OFF',
      valueDisplay: device.chargingInterlock ? 'CHARGING ACTIVE' : 'LOCKED OUT (SAFE)',
      passed: chargingPassed,
      detail: chargingPassed
        ? 'Hardware isolated from mains/charger. LT8365 HV stimulator armed.'
        : 'Safety lockout engaged: stimulation is hardware-disabled while USB-C or Qi charging is active.',
    },
  ];

  return {
    allPassed: checks.every((c) => c.passed),
    checks,
  };
}

export interface WaveformPoint {
  tMs: number;
  r1Uv: number;
  r2Uv: number;
}

/**
 * Synthesizes realistic dual-channel SNAP curves (Site 1 R1 proximal & Site 2 +30mm distal)
 * with stimulus blanking window (0 - 1.2 ms) and biphasic sensory nerve action potential morphology.
 */
export function generateSnapWaveform(params: {
  onsetLatencyMs: number;
  deltaTMs: number;
  amplitudeUv: number;
  noiseUv?: number;
  durationMs?: number;
  stepMs?: number;
}): WaveformPoint[] {
  const {
    onsetLatencyMs,
    deltaTMs,
    amplitudeUv,
    noiseUv = 0.25,
    durationMs = 8.0,
    stepMs = 0.05,
  } = params;

  const points: WaveformPoint[] = [];
  const t2Onset = onsetLatencyMs + deltaTMs;
  const blankEndMs = 1.2;

  // Deterministic pseudo-noise for repeatable, clean oscilloscope rendering
  const deterministicNoise = (t: number, channelOffset: number) =>
    noiseUv * (Math.sin(t * 17.3 + channelOffset) * 0.55 + Math.cos(t * 31.7 + channelOffset * 2) * 0.45);

  // Biphasic SNAP waveform kernel centered relative to onset
  const snapKernel = (t: number, onset: number, amp: number): number => {
    const dt = t - onset;
    if (dt < -0.15) return 0;
    // Negative upward peak around onset + 0.85ms, followed by positive after-potential
    const negPeakCenter = 0.82;
    const posPeakCenter = 1.75;
    const negComponent = amp * 0.72 * Math.exp(-Math.pow((dt - negPeakCenter) / 0.36, 2));
    const posComponent = -amp * 0.28 * Math.exp(-Math.pow((dt - posPeakCenter) / 0.45, 2));
    // Smooth onset ramp
    const gate = dt < 0 ? Math.exp(-Math.pow(dt / 0.08, 2)) * 0.15 : 1;
    return (negComponent + posComponent) * gate;
  };

  for (let t = 0; t <= durationMs + 0.0001; t += stepMs) {
    const tRounded = Number(t.toFixed(2));
    if (tRounded <= blankEndMs) {
      // Stimulus blanking & recovery tail
      const artifact = tRounded < 0.25 ? 2.5 * Math.exp(-tRounded / 0.12) : 0;
      points.push({
        tMs: tRounded,
        r1Uv: Number(artifact.toFixed(2)),
        r2Uv: Number((artifact * 0.7).toFixed(2)),
      });
      continue;
    }

    const r1 = snapKernel(tRounded, onsetLatencyMs, amplitudeUv) + deterministicNoise(tRounded, 0.3);
    const r2 = snapKernel(tRounded, t2Onset, amplitudeUv * 0.92) + deterministicNoise(tRounded, 1.9);

    points.push({
      tMs: tRounded,
      r1Uv: Number(r1.toFixed(2)),
      r2Uv: Number(r2.toFixed(2)),
    });
  }

  return points;
}

/**
 * Formats assessment records into an RFC-4180 CSV export for clinical records.
 */
export function formatAssessmentCsv(records: AssessmentRecord[]): string {
  const headers = [
    'Test ID',
    'Date',
    'Week',
    'Nerve',
    'Corrected NCV (m/s)',
    'Raw NCV (m/s)',
    'SNAP Amplitude (uV)',
    'Onset Latency t1 (ms)',
    'Peak Latency (ms)',
    'Delta t (ms)',
    'Skin Temp (C)',
    'Temp Corrected',
    'Stimulus (mA)',
    'Impedance (kOhm)',
    'Sweeps Averaged',
    'Clinical Notes',
  ];

  const escapeCsv = (val: string | number | boolean) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = records.map((r) =>
    [
      r.id,
      r.date,
      r.weekLabel,
      r.nerve === 'sural' ? 'Sural (Calf)' : 'Median (Wrist)',
      r.ncv.toFixed(1),
      r.rawNcv.toFixed(1),
      r.amplitude.toFixed(1),
      r.onsetLatency.toFixed(2),
      r.peakLatency.toFixed(2),
      r.deltaT.toFixed(2),
      r.tempC.toFixed(1),
      r.tempCorrected ? 'Yes' : 'No',
      r.stimCurrentMa,
      r.impedanceKOhm.toFixed(1),
      r.sweepsAveraged,
      r.notes,
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
