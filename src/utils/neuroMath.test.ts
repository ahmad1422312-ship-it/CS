import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTemperatureCorrection,
  calculateNCV,
  calculatePercentChange,
  evaluateAlertStatus,
  evaluatePreChecks,
  formatAssessmentCsv,
  generateSnapWaveform,
} from './neuroMath';
import type { DeviceState } from '../types/clinical';

test('calculateNCV computes Δd / Δt accurately', () => {
  assert.equal(calculateNCV(30, 0.66), 45.5);
  assert.equal(calculateNCV(30, 0.76), 39.5);
  assert.equal(calculateNCV(30, 0), 0);
});

test('applyTemperatureCorrection adds 1.8 m/s per °C below 32.0°C', () => {
  const warm = applyTemperatureCorrection(45.2, 33.0);
  assert.equal(warm.isActive, false);
  assert.equal(warm.correctedNcv, 45.2);
  assert.equal(warm.appliedOffset, 0);

  const cold = applyTemperatureCorrection(39.8, 30.0);
  assert.equal(cold.isActive, true);
  assert.equal(cold.appliedOffset, 3.6);
  assert.equal(cold.correctedNcv, 43.4);
});

test('evaluateAlertStatus detects CV and Amplitude threshold breaches', () => {
  const baseline = { ncv: 45.5, amplitude: 18.2 };
  const thresholds = { cvReductionAlertPct: 10, ampReductionAlertPct: 20 };

  const alertCase = evaluateAlertStatus({ ncv: 39.5, amplitude: 13.4 }, baseline, thresholds);
  assert.equal(alertCase.status, 'alert');
  assert.equal(alertCase.cvChangePct, -13.2);
  assert.equal(alertCase.ampChangePct, -26.4);
  assert.equal(alertCase.cvAlertTriggered, true);
  assert.equal(alertCase.ampAlertTriggered, true);

  const nominalCase = evaluateAlertStatus({ ncv: 45.1, amplitude: 17.9 }, baseline, thresholds);
  assert.equal(nominalCase.status, 'nominal');
  assert.equal(nominalCase.cvAlertTriggered, false);
  assert.equal(nominalCase.ampAlertTriggered, false);
});

test('evaluatePreChecks blocks when charging interlock, cold skin, high impedance, or IMU motion occurs', () => {
  const baseDevice: DeviceState = {
    bleMode: 'simulator',
    connected: true,
    deviceName: 'NerveTrace-XIAO-840',
    firmwareVersion: 'v2.4.1',
    batteryPct: 88,
    impedanceKOhm: 4.2,
    skinTempC: 33.0,
    imuMotionG: 0.012,
    chargingInterlock: false,
    stimCurrentMa: 20,
    pulseWidthMs: 0.15,
    lastError: null,
  };

  assert.equal(evaluatePreChecks(baseDevice).allPassed, true);

  assert.equal(
    evaluatePreChecks({ ...baseDevice, chargingInterlock: true }).allPassed,
    false
  );
  assert.equal(
    evaluatePreChecks({ ...baseDevice, skinTempC: 29.6 }).allPassed,
    false
  );
  assert.equal(
    evaluatePreChecks({ ...baseDevice, impedanceKOhm: 12.4 }).allPassed,
    false
  );
  assert.equal(
    evaluatePreChecks({ ...baseDevice, imuMotionG: 0.08 }).allPassed,
    false
  );
});

test('generateSnapWaveform creates dual-channel curve with blanking window and peak', () => {
  const points = generateSnapWaveform({
    onsetLatencyMs: 3.48,
    deltaTMs: 0.66,
    amplitudeUv: 13.4,
  });
  assert.ok(points.length > 100);
  const blankSample = points.find((p) => p.tMs === 0.8);
  assert.equal(blankSample?.r1Uv, 0);
  const maxR1 = Math.max(...points.filter((p) => p.tMs > 2.5).map((p) => p.r1Uv));
  assert.ok(maxR1 > 6);
});

test('calculatePercentChange and formatAssessmentCsv produce valid outputs', () => {
  assert.equal(calculatePercentChange(13.4, 18.2), -26.4);
  const csv = formatAssessmentCsv([
    {
      id: 'TEST-008',
      date: '2026-11-14',
      weekLabel: 'Wk 8',
      nerve: 'sural',
      rawNcv: 39.5,
      ncv: 39.5,
      amplitude: 13.4,
      onsetLatency: 3.48,
      peakLatency: 4.42,
      deltaT: 0.66,
      tempC: 33.0,
      tempCorrected: false,
      stimCurrentMa: 20,
      pulseWidthMs: 0.15,
      sweepsAveraged: 16,
      sweepsRejected: 1,
      impedanceKOhm: 4.2,
      imuMotionG: 0.012,
      notes: 'Clinical review advised',
    },
  ]);
  assert.ok(csv.includes('TEST-008'));
  assert.ok(csv.includes('Sural (Calf)'));
});
