import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Footprints,
  Play,
  Thermometer,
  ChevronRight,
} from 'lucide-react';
import type {
  AssessmentRecord,
  NerveBaseline,
  NerveType,
  PatientProfile,
  ThresholdConfig,
} from '../types/clinical';
import { evaluateAlertStatus } from '../utils/neuroMath';

interface SummaryTabProps {
  patient: PatientProfile;
  activeNerve: NerveType;
  onSelectNerve: (nerve: NerveType) => void;
  baseline: NerveBaseline;
  records: AssessmentRecord[];
  thresholds: ThresholdConfig;
  onOpenReport: (record: AssessmentRecord) => void;
  onStartAssessment: () => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  patient,
  activeNerve,
  onSelectNerve,
  baseline,
  records,
  thresholds,
  onOpenReport,
  onStartAssessment,
}) => {
  const latestRecord = records[0];
  const alertEval = latestRecord
    ? evaluateAlertStatus(latestRecord, baseline, thresholds)
    : null;

  const tempCorrectionActive =
    latestRecord !== undefined &&
    (latestRecord.tempCorrected || latestRecord.tempC >= 32.0);

  return (
    <div className="space-y-6">
      {/* Top Condition + Nerve Selector + Clinical Alert Card */}
      <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-5 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500">
              Active Monitoring Condition · {patient.clinic}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">
              {patient.condition}{' '}
              <span className="font-normal text-slate-500">
                — {patient.prevalenceNote}
              </span>
            </h1>
          </div>

          {/* Interactive Nerve Switcher */}
          <div
            role="group"
            aria-label="Target Peripheral Nerve Selection"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1 self-start lg:self-auto"
          >
            <button
              type="button"
              onClick={() => onSelectNerve('sural')}
              aria-pressed={activeNerve === 'sural'}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeNerve === 'sural'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              Sural (Calf)
            </button>
            <button
              type="button"
              onClick={() => onSelectNerve('median')}
              aria-pressed={activeNerve === 'median'}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeNerve === 'median'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              Median (Wrist)
            </button>
          </div>
        </div>

        {/* Alert Banner */}
        {latestRecord && alertEval && (
          <div
            role="status"
            className={`mt-5 flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center ${
              alertEval.status === 'alert'
                ? 'border-amber-300 bg-amber-50/80'
                : alertEval.status === 'watch'
                ? 'border-amber-200 bg-amber-50/40'
                : 'border-teal-200 bg-teal-50/60'
            }`}
          >
            <div className="flex items-start gap-3">
              {alertEval.status === 'nominal' ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#0D9488]"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
              )}
              <div>
                <div className="text-sm font-bold text-[#0F172A]">
                  {alertEval.status === 'alert'
                    ? 'CLINICAL REVIEW ADVISED: Meaningful reduction detected relative to personal baseline'
                    : alertEval.status === 'watch'
                    ? 'MONITORING WATCH: Mild sensory conduction drift relative to personal baseline'
                    : 'WITHIN SUPERVISED BASELINE: Nerve conduction metrics remain stable'}
                </div>
                <p className="mt-0.5 text-xs text-slate-700">
                  Latest scan <span className="font-mono font-semibold">{latestRecord.id}</span> ({latestRecord.date}) ·{' '}
                  NCV {alertEval.cvChangePct > 0 ? `+${alertEval.cvChangePct}` : alertEval.cvChangePct}% ·{' '}
                  SNAP {alertEval.ampChangePct > 0 ? `+${alertEval.ampChangePct}` : alertEval.ampChangePct}% vs. {baseline.label} baseline
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenReport(latestRecord)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <FileText className="h-3.5 w-3.5 text-[#0D9488]" aria-hidden="true" />
                <span>View NCS Report</span>
              </button>
              <button
                type="button"
                onClick={onStartAssessment}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F766E] whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Perform New Assessment</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4-Card KPI Grid */}
      {latestRecord && alertEval && (
        <section aria-label="Latest Nerve Conduction Metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* KPI 1: Conduction Velocity */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5">
            <div className="text-xs font-semibold tracking-wide text-slate-500">
              Conduction Velocity (NCV)
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[#0F172A]">
                {latestRecord.ncv.toFixed(1)}
              </span>
              <span className="font-mono text-xs font-medium text-slate-500">m/s</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-[#E2E8F0] pt-3 text-xs">
              <div
                className={`font-mono font-semibold tabular-nums ${
                  alertEval.cvAlertTriggered ? 'text-amber-700' : 'text-[#0D9488]'
                }`}
              >
                {alertEval.cvChangePct > 0 ? `+${alertEval.cvChangePct}` : alertEval.cvChangePct}% vs supervised baseline {baseline.ncv.toFixed(1)} m/s
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                CV = Δd / Δt · Fixed {baseline.interRecordingMm}mm
              </div>
            </div>
          </div>

          {/* KPI 2: SNAP Amplitude */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5">
            <div className="text-xs font-semibold tracking-wide text-slate-500">
              SNAP Amplitude
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[#0F172A]">
                {latestRecord.amplitude.toFixed(1)}
              </span>
              <span className="font-mono text-xs font-medium text-slate-500">μV</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-[#E2E8F0] pt-3 text-xs">
              <div
                className={`font-mono font-semibold tabular-nums ${
                  alertEval.ampAlertTriggered ? 'text-rose-700' : 'text-[#0D9488]'
                }`}
              >
                {alertEval.ampChangePct > 0 ? `+${alertEval.ampChangePct}` : alertEval.ampChangePct}% vs baseline {baseline.amplitude.toFixed(1)} μV
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                Peak-to-Peak · {latestRecord.sweepsAveraged} sweeps averaged
              </div>
            </div>
          </div>

          {/* KPI 3: Onset Latency (t1) */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5">
            <div className="text-xs font-semibold tracking-wide text-slate-500">
              Onset Latency (t1)
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[#0F172A]">
                {latestRecord.onsetLatency.toFixed(2)}
              </span>
              <span className="font-mono text-xs font-medium text-slate-500">ms</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-[#E2E8F0] pt-3 text-xs">
              <div className="font-mono font-medium tabular-nums text-slate-700">
                Peak latency: {latestRecord.peakLatency.toFixed(2)} ms
              </div>
              <div className="font-mono text-[11px] tabular-nums text-slate-500">
                {baseline.electrodeDistanceCm} cm distance · Δt: {latestRecord.deltaT.toFixed(2)} ms
              </div>
            </div>
          </div>

          {/* KPI 4: Cutaneous Temp (TMP117) */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5">
            <div className="text-xs font-semibold tracking-wide text-slate-500">
              Cutaneous Temp (TMP117)
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[#0F172A]">
                {latestRecord.tempC.toFixed(1)}
              </span>
              <span className="font-mono text-xs font-medium text-slate-500">°C</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-[#E2E8F0] pt-3 text-xs">
              <div className="font-mono font-semibold tabular-nums text-[#0D9488]">
                Optimal target ≥ 32.0°C
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                Correction: 1.8 m/s / °C {tempCorrectionActive ? 'Active' : 'Standby'}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Middle 2-Column Split: Temperature-Aware Innovation & Diabetic Foot Health Routine */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0D9488]">
              <Thermometer className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Temperature-Aware Nerve Velocity Normalization
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Onboard TMP117 ±0.1°C Medical-Grade Skin Thermistor
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Cool distal skin slows sodium-channel gating and mimics demyelinating neuropathy. NerveTrace PATCH continuously samples cutaneous temperature at the recording strip and applies calibrated linear compensation (<span className="font-mono font-medium text-[#0F172A]">1.8 m/s per °C</span>) whenever limb skin cools below <span className="font-mono font-medium text-[#0F172A]">32.0°C</span>.
          </p>
          <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs">
            <div className="font-semibold text-[#0F172A]">
              Verified Patient Normalization Example
            </div>
            <div className="mt-1 font-mono tabular-nums text-slate-700">
              Test 004: Raw cold velocity at 29.6°C was 39.8 m/s → corrected to 44.6 m/s
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F172A]">
              <Footprints className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Diabetic Foot Health & Pre-Scan Routine
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Weekly Home Neuropathy Surveillance Protocol
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <span className="mt-1 font-mono text-xs font-semibold text-[#0D9488]">01</span>
              <span>Inspect lateral malleolus, plantar arch, and toes for fissures, callus, or erythema prior to hydrogel placement.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 font-mono text-xs font-semibold text-[#0D9488]">02</span>
              <span>Warm lower leg for 10 minutes if skin feels cool (&lt; 32.0°C) and cleanse skin with alcohol prep to keep impedance &lt; 10 kΩ.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 font-mono text-xs font-semibold text-[#0D9488]">03</span>
              <span>Share any sustained ≥ 20% SNAP amplitude or ≥ 10% NCV drop with {patient.supervisor}.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Assessment History & Logs */}
      <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF]">
        <div className="flex flex-col justify-between gap-2 border-b border-[#E2E8F0] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Assessment History & Logs — {baseline.label}
            </h2>
            <p className="text-xs text-slate-500">
              Select any recorded test row to inspect the formal Clinical NCS Study Report (IEC 60601-2-40).
            </p>
          </div>
          <div className="font-mono text-xs tabular-nums text-slate-500">
            {records.length} recorded assessments
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold tracking-wide text-slate-500">
                <th className="px-5 py-3">Test ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">NCV (m/s)</th>
                <th className="px-4 py-3 text-right">SNAP (μV)</th>
                <th className="px-4 py-3 text-right">t1 (ms)</th>
                <th className="px-4 py-3 text-right">Skin Temp</th>
                <th className="px-4 py-3">Baseline Delta</th>
                <th className="px-5 py-3 text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {records.map((rec) => {
                const evalRes = evaluateAlertStatus(rec, baseline, thresholds);
                return (
                  <tr
                    key={rec.id}
                    className="transition-colors hover:bg-[#F8FAFC]"
                  >
                    <td className="px-5 py-3.5 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                      {rec.id}
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {rec.date} · {rec.weekLabel}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-[#0F172A] whitespace-nowrap">
                      {rec.ncv.toFixed(1)}
                      {rec.tempCorrected && (
                        <span className="ml-1.5 text-[11px] font-normal text-[#0D9488]">
                          (raw {rec.rawNcv.toFixed(1)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-[#0F172A] whitespace-nowrap">
                      {rec.amplitude.toFixed(1)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {rec.onsetLatency.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {rec.tempC.toFixed(1)} °C
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          evalRes.status === 'alert'
                            ? 'text-amber-700'
                            : evalRes.status === 'watch'
                            ? 'text-amber-600'
                            : 'text-[#0D9488]'
                        }`}
                      >
                        {evalRes.status === 'alert'
                          ? 'Review Advised'
                          : evalRes.status === 'watch'
                          ? 'Watch'
                          : 'Nominal'}
                      </span>
                      <span className="ml-2 text-slate-500">
                        ({evalRes.cvChangePct > 0 ? `+${evalRes.cvChangePct}` : evalRes.cvChangePct}% CV)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenReport(rec)}
                        aria-label={`Open Clinical NCS Report for ${rec.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#0D9488] hover:text-[#0D9488]"
                      >
                        <span>NCS Report</span>
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
