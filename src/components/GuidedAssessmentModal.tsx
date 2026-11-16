import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import type {
  AssessmentRecord,
  DeviceState,
  NerveBaseline,
  NerveType,
} from '../types/clinical';
import {
  applyTemperatureCorrection,
  calculateNCV,
  calculatePercentChange,
  evaluatePreChecks,
  generateSnapWaveform,
} from '../utils/neuroMath';

interface GuidedAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNerve: NerveType;
  onSelectNerve: (nerve: NerveType) => void;
  baselines: Record<NerveType, NerveBaseline>;
  device: DeviceState;
  onOpenDeviceBridge: () => void;
  onSaveRecord: (record: AssessmentRecord) => void;
  nextTestNumber: number;
}

const TOTAL_STEPS = 5;

export const GuidedAssessmentModal: React.FC<GuidedAssessmentModalProps> = ({
  isOpen,
  onClose,
  activeNerve,
  onSelectNerve,
  baselines,
  device,
  onOpenDeviceBridge,
  onSaveRecord,
  nextTestNumber,
}) => {
  const [step, setStep] = useState<number>(1);
  const [stimCurrentMa, setStimCurrentMa] = useState<number>(12);
  const [pulseWidthMs, setPulseWidthMs] = useState<number>(0.15);
  const [sweepsAcquired, setSweepsAcquired] = useState<number>(0);
  const [sweepsRejected, setSweepsRejected] = useState<number>(0);
  const [isAcquiring, setIsAcquiring] = useState<boolean>(false);

  const baseline = baselines[activeNerve];
  const preCheckSummary = evaluatePreChecks(device);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStimCurrentMa(12);
      setPulseWidthMs(0.15);
      setSweepsAcquired(0);
      setSweepsRejected(0);
      setIsAcquiring(false);
    }
  }, [isOpen]);

  // Step 4: 16-sweep acquisition simulation loop
  useEffect(() => {
    if (!isOpen || step !== 4 || !isAcquiring) return;
    if (sweepsAcquired >= 16) {
      setIsAcquiring(false);
      return;
    }
    const timer = setTimeout(() => {
      // Simulate occasional motion artifact rejection if IMU > 0.025g
      if (device.imuMotionG > 0.025 && sweepsAcquired % 5 === 2 && sweepsRejected < 2) {
        setSweepsRejected((r) => r + 1);
      } else {
        setSweepsAcquired((s) => Math.min(16, s + 1));
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [isOpen, step, isAcquiring, sweepsAcquired, sweepsRejected, device.imuMotionG]);

  // Compute realistic deterministic results from current stimulus, skin temp, and nerve baseline
  const computedResult = useMemo(() => {
    const stimFactor = Math.min(1, stimCurrentMa / 20);
    const rawAmp = Number(
      (baseline.amplitude * (0.86 * stimFactor + 0.04)).toFixed(1)
    );
    const deltaT = Number((activeNerve === 'sural' ? 0.68 : 0.59).toFixed(2));
    const rawVelocity = calculateNCV(baseline.interRecordingMm, deltaT);
    const tempEval = applyTemperatureCorrection(rawVelocity, device.skinTempC);
    const onset = Number((baseline.onsetLatency + 0.08).toFixed(2));
    const peak = Number((onset + 0.88).toFixed(2));

    const testId =
      activeNerve === 'sural'
        ? `TEST-${String(nextTestNumber).padStart(3, '0')}`
        : `TEST-M${String(nextTestNumber).padStart(2, '0')}`;

    return {
      id: testId,
      rawNcv: rawVelocity,
      ncv: tempEval.correctedNcv,
      tempCorrected: tempEval.isActive,
      amplitude: rawAmp,
      onsetLatency: onset,
      peakLatency: peak,
      deltaT,
      tempC: device.skinTempC,
      cvDeltaPct: calculatePercentChange(tempEval.correctedNcv, baseline.ncv),
      ampDeltaPct: calculatePercentChange(rawAmp, baseline.amplitude),
    };
  }, [activeNerve, baseline, device.skinTempC, nextTestNumber, stimCurrentMa]);

  const previewWaveform = useMemo(() => {
    return generateSnapWaveform({
      onsetLatencyMs: computedResult.onsetLatency,
      deltaTMs: computedResult.deltaT,
      amplitudeUv: computedResult.amplitude * Math.max(0.25, sweepsAcquired / 16),
      noiseUv: Math.max(0.18, 1.4 - sweepsAcquired * 0.075),
    });
  }, [computedResult, sweepsAcquired]);

  if (!isOpen) return null;

  const handleSaveAndFinish = () => {
    const newRecord: AssessmentRecord = {
      id: computedResult.id,
      date: new Date().toISOString().slice(0, 10),
      weekLabel: `Wk ${nextTestNumber}`,
      nerve: activeNerve,
      rawNcv: computedResult.rawNcv,
      ncv: computedResult.ncv,
      amplitude: computedResult.amplitude,
      onsetLatency: computedResult.onsetLatency,
      peakLatency: computedResult.peakLatency,
      deltaT: computedResult.deltaT,
      tempC: Number(device.skinTempC.toFixed(1)),
      tempCorrected: computedResult.tempCorrected,
      stimCurrentMa,
      pulseWidthMs,
      sweepsAveraged: 16,
      sweepsRejected,
      impedanceKOhm: Number(device.impedanceKOhm.toFixed(1)),
      imuMotionG: Number(device.imuMotionG.toFixed(3)),
      notes: computedResult.tempCorrected
        ? `Guided acquisition completed with TMP117 compensation (${device.skinTempC.toFixed(1)}°C).`
        : 'Guided supramaximal 16-sweep acquisition completed.',
    };
    onSaveRecord(newRecord);
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-assessment-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <div className="font-mono text-[11px] font-semibold text-[#0D9488] uppercase">
              Guided Nerve-Conduction Assessment · Step {step} of {TOTAL_STEPS}
            </div>
            <h2 id="guided-assessment-title" className="text-lg font-bold text-[#0F172A]">
              {step === 1 && 'Step 1: Anatomical Electrode Placement'}
              {step === 2 && 'Step 2: Automated Hardware Safety Pre-Checks'}
              {step === 3 && 'Step 3: Supramaximal Stimulus Calibration'}
              {step === 4 && 'Step 4: 16-Sweep Acquisition & Signal Averaging'}
              {step === 5 && 'Step 5: Results & Personal Baseline Comparison'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Guided Assessment"
            className="rounded-lg border border-[#E2E8F0] p-2 text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          {[
            '1. Placement',
            '2. Pre-Checks',
            '3. Stimulus',
            '4. 16 Sweeps',
            '5. Results',
          ].map((label, idx) => {
            const s = idx + 1;
            const active = s === step;
            const done = s < step;
            return (
              <div
                key={label}
                className={`border-b-2 px-3 py-2 text-center text-[11px] font-semibold whitespace-nowrap ${
                  active
                    ? 'border-[#0D9488] bg-[#FFFFFF] text-[#0F172A]'
                    : done
                    ? 'border-[#0D9488]/40 text-[#0D9488]'
                    : 'border-transparent text-slate-400'
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: STRICT ANATOMICAL LINE DIAGRAMS */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-600">
                  Select target sensory nerve and verify the 6-electrode alignment before running pre-checks.
                </p>
                <div className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1">
                  <button
                    type="button"
                    onClick={() => onSelectNerve('sural')}
                    aria-pressed={activeNerve === 'sural'}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      activeNerve === 'sural' ? 'bg-[#0F172A] text-white' : 'text-slate-600'
                    }`}
                  >
                    Sensory Sural Nerve (Calf)
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectNerve('median')}
                    aria-pressed={activeNerve === 'median'}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                      activeNerve === 'median' ? 'bg-[#0F172A] text-white' : 'text-slate-600'
                    }`}
                  >
                    Sensory Median Nerve (Wrist)
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2.5 text-xs">
                  <span className="font-bold text-[#0F172A]">
                    {activeNerve === 'sural'
                      ? 'Sensory Sural Nerve (Lateral Lower Leg / Calf) — Strip Length 23 cm'
                      : 'Sensory Median Nerve (Palmar Wrist & Index Finger)'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {activeNerve === 'sural'
                      ? '14 cm (cathode → R1) · Δd = 3 cm · Antidromic'
                      : '13–14 cm (cathode → R1) · Δd = 3 cm · Antidromic'}
                  </span>
                </div>

                <div className="flex justify-center overflow-hidden rounded-lg border border-[#E2E8F0] bg-white p-2">
                  <img
                    src={
                      activeNerve === 'sural'
                        ? '/assets/aistudio/___________e6bddbbc.jpeg'
                        : '/assets/aistudio/__________06c90d4b.jpeg'
                    }
                    alt={
                      activeNerve === 'sural'
                        ? 'Technical line diagram showing Sensory Sural Nerve 23 cm electrode strip placement on lateral lower leg with electrodes 1 Cathode, 2 Anode, 3 Ground, 4 R1, 5 R2, and 6 Reference'
                        : 'Technical line diagram showing Sensory Median Nerve palmar wrist strip 1-3 and index finger ring electrodes 4-6 placement'
                    }
                    referrerPolicy="no-referrer"
                    className="max-h-72 w-auto object-contain"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-700 sm:grid-cols-3">
                  <div>
                    <span className="font-mono font-bold text-amber-700">[1] Cathode · [2] Anode</span> (2 cm spacing)
                  </div>
                  <div>
                    <span className="font-mono font-bold text-slate-700">[3] Ground</span> (between stim & R1)
                  </div>
                  <div>
                    <span className="font-mono font-bold text-sky-700">[4] R1 · [5] R2</span> (Δd = 3 cm) ·{' '}
                    <span className="font-mono font-bold text-emerald-700">[6] Reference</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AUTOMATED HARDWARE PRE-CHECKS */}
          {step === 2 && (
            <div className="space-y-4">
              <div
                className={`flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${
                  preCheckSummary.allPassed
                    ? 'border-teal-200 bg-teal-50/70'
                    : 'border-rose-200 bg-rose-50/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  {preCheckSummary.allPassed ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0D9488]" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" aria-hidden="true" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">
                      {preCheckSummary.allPassed
                        ? 'All Hardware Safety Pre-Checks Passed'
                        : 'Safety Gate Blocked — Resolve Failing Pre-Check Before Stimulation'}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-700">
                      Reading live telemetry from {device.deviceName} ({device.bleMode === 'simulator' ? 'Hardware Simulator' : 'Web Bluetooth'}).
                    </p>
                  </div>
                </div>

                {!preCheckSummary.allPassed && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeviceBridge();
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Cpu className="h-3.5 w-3.5 text-[#2DD4BF]" aria-hidden="true" />
                    <span>Adjust in Device & BLE Bridge</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {preCheckSummary.checks.map((chk) => (
                  <div
                    key={chk.key}
                    className={`rounded-xl border p-4 ${
                      chk.passed
                        ? 'border-[#E2E8F0] bg-[#FFFFFF]'
                        : 'border-rose-300 bg-rose-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A]">{chk.label}</span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          chk.passed ? 'text-[#0D9488]' : 'text-rose-700'
                        }`}
                      >
                        {chk.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
                      <span className="text-xl font-bold text-[#0F172A]">{chk.valueDisplay}</span>
                      <span className="text-xs text-slate-500">Target: {chk.requirement}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{chk.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: STIMULUS CALIBRATION */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-xs font-semibold text-[#0D9488] uppercase">
                      LT8365 Constant-Current Output Stage
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#0F172A]">
                      Ramp stimulus current (0–40 mA) until supramaximal SNAP plateau (20 mA target)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStimCurrentMa(20)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0F766E] whitespace-nowrap"
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Auto-Ramp to 20 mA Plateau</span>
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <label htmlFor="stim-current-slider" className="text-[#0F172A]">
                        Stimulus Amplitude (mA)
                      </label>
                      <span className="font-mono text-base font-bold tabular-nums text-[#0F172A]">
                        {stimCurrentMa} mA
                      </span>
                    </div>
                    <input
                      id="stim-current-slider"
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={stimCurrentMa}
                      onChange={(e) => setStimCurrentMa(Number(e.target.value))}
                      className="mt-2 h-2 w-full cursor-pointer accent-[#0D9488]"
                    />
                    <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                      <span>0 mA</span>
                      <span>20 mA (Supramaximal)</span>
                      <span>40 mA max</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <label htmlFor="pulse-width-slider" className="text-[#0F172A]">
                        Pulse Width Clamp (≤ 0.20 ms)
                      </label>
                      <span className="font-mono text-base font-bold tabular-nums text-[#0F172A]">
                        {pulseWidthMs.toFixed(2)} ms
                      </span>
                    </div>
                    <input
                      id="pulse-width-slider"
                      type="range"
                      min="0.10"
                      max="0.20"
                      step="0.01"
                      value={pulseWidthMs}
                      onChange={(e) => setPulseWidthMs(Number(e.target.value))}
                      className="mt-2 h-2 w-full cursor-pointer accent-[#0F172A]"
                    />
                    <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                      <span>0.10 ms</span>
                      <span>0.15 ms nominal</span>
                      <span>0.20 ms clamp</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 text-xs">
                <span className="text-slate-600">
                  Projected SNAP Recruitment at <span className="font-mono font-bold text-[#0F172A]">{stimCurrentMa} mA</span>:
                </span>
                <span className="font-mono font-bold tabular-nums text-[#0D9488]">
                  {stimCurrentMa >= 20 ? '100% Supramaximal Plateau Reached' : `${Math.round((stimCurrentMa / 20) * 100)}% Recruitment`}
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: 16-SWEEP ACQUISITION & AVERAGING */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">
                    16-Sweep Coherent Ensemble Averaging
                  </div>
                  <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-600">
                    Acquired: {sweepsAcquired} / 16 sweeps · Motion Artifacts Rejected: {sweepsRejected}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (sweepsAcquired >= 16) {
                      setSweepsAcquired(0);
                      setSweepsRejected(0);
                    }
                    setIsAcquiring(true);
                  }}
                  disabled={isAcquiring}
                  className="rounded-lg bg-[#0D9488] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0F766E] disabled:opacity-60 whitespace-nowrap"
                >
                  {isAcquiring
                    ? 'Acquiring Sweeps...'
                    : sweepsAcquired >= 16
                    ? 'Re-Acquire 16 Sweeps'
                    : 'Start 16-Sweep Capture'}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-[#0D9488] transition-all duration-150"
                  style={{ width: `${(sweepsAcquired / 16) * 100}%` }}
                />
              </div>

              {/* Live Averaged SNAP Waveform */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0B1120] p-3">
                <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span>Live Averaged SNAP · {baseline.label}</span>
                  <span className="text-[#2DD4BF]">
                    SNR Gain: {sweepsAcquired > 0 ? `×${Math.sqrt(sweepsAcquired).toFixed(1)}` : 'Idle'}
                  </span>
                </div>
                <svg viewBox="0 0 640 180" className="h-auto w-full">
                  <line x1="20" y1="95" x2="620" y2="95" stroke="#334155" strokeWidth="1" />
                  <rect x="20" y="15" width="85" height="150" fill="#F59E0B" fillOpacity="0.12" />
                  <text
                    x="62"
                    y="32"
                    textAnchor="middle"
                    fill="#FBBF24"
                    fontSize="10"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    BLANK
                  </text>
                  <path
                    d={previewWaveform
                      .map((pt, i) => {
                        const x = 20 + (pt.tMs / 8.0) * 600;
                        const y = 95 - pt.r1Uv * 3.8;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#2DD4BF"
                    strokeWidth="2.4"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* STEP 5: RESULTS & BASELINE COMPARISON */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[#0D9488]" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">
                    Acquisition Complete — Ready to Commit {computedResult.id}
                  </div>
                  <p className="text-xs text-slate-700">
                    16 sweeps averaged at {stimCurrentMa} mA ({pulseWidthMs.toFixed(2)} ms). Compared against {baseline.label} supervised baseline.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="text-xs text-slate-500">Conduction Velocity</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F172A]">
                    {computedResult.ncv.toFixed(1)} <span className="text-xs font-normal">m/s</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#0D9488]">
                    {computedResult.cvDeltaPct}% vs baseline
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="text-xs text-slate-500">SNAP Amplitude</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F172A]">
                    {computedResult.amplitude.toFixed(1)} <span className="text-xs font-normal">μV</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-600">
                    {computedResult.ampDeltaPct}% vs baseline
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="text-xs text-slate-500">Onset Latency (t1)</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F172A]">
                    {computedResult.onsetLatency.toFixed(2)} <span className="text-xs font-normal">ms</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-600">
                    Δt {computedResult.deltaT.toFixed(2)} ms
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="text-xs text-slate-500">Cutaneous Temp</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F172A]">
                    {computedResult.tempC.toFixed(1)} <span className="text-xs font-normal">°C</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-600">
                    {computedResult.tempCorrected ? 'Temp-Normalized' : 'Optimal Range'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{step === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              disabled={
                (step === 2 && !preCheckSummary.allPassed) ||
                (step === 4 && sweepsAcquired < 16)
              }
              onClick={() => {
                const next = step + 1;
                setStep(next);
                if (next === 4) {
                  setSweepsAcquired(0);
                  setSweepsRejected(0);
                  setIsAcquiring(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <span>Continue</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndFinish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F766E]"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Save to Assessment History</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
