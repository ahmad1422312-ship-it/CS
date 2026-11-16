import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Lock,
  Printer,
  RotateCcw,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import type {
  AssessmentRecord,
  NerveBaseline,
  NerveType,
  PatientProfile,
  ThresholdConfig,
} from '../types/clinical';
import { evaluateAlertStatus, formatAssessmentCsv } from '../utils/neuroMath';

interface ClinicianViewProps {
  patient: PatientProfile;
  activeNerve: NerveType;
  onSelectNerve: (nerve: NerveType) => void;
  baseline: NerveBaseline;
  records: AssessmentRecord[];
  thresholds: ThresholdConfig;
  onUpdateThresholds: (next: ThresholdConfig) => void;
  onLockBaselineFromLatest: () => void;
  onOpenReport: (record: AssessmentRecord) => void;
}

export const ClinicianView: React.FC<ClinicianViewProps> = ({
  patient,
  activeNerve,
  onSelectNerve,
  baseline,
  records,
  thresholds,
  onUpdateThresholds,
  onLockBaselineFromLatest,
  onOpenReport,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert' | 'nominal'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [syncedHoverIdx, setSyncedHoverIdx] = useState<number | null>(null);
  const [baselineLockedNotice, setBaselineLockedNotice] = useState<boolean>(false);

  const chronological = [...records].reverse();

  const filteredRecords = records.filter((rec) => {
    const evalRes = evaluateAlertStatus(rec, baseline, thresholds);
    if (statusFilter === 'alert' && evalRes.status === 'nominal') return false;
    if (statusFilter === 'nominal' && evalRes.status !== 'nominal') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.date.toLowerCase().includes(q) ||
        rec.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const csv = formatAssessmentCsv(filteredRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NerveTrace_${patient.mrn}_${activeNerve}_NCS_Log.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLockBaseline = () => {
    onLockBaselineFromLatest();
    setBaselineLockedNotice(true);
    setTimeout(() => setBaselineLockedNotice(false), 3000);
  };

  const renderSynchronizedPanel = (panel: {
    title: string;
    unit: string;
    minY: number;
    maxY: number;
    values: number[];
    refValue?: number;
    stroke: string;
  }) => {
    const W = 360;
    const H = 160;
    const padL = 40;
    const padR = 14;
    const padT = 16;
    const padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const getX = (i: number) =>
      chronological.length <= 1
        ? padL + plotW / 2
        : padL + (i / (chronological.length - 1)) * plotW;

    const getY = (v: number) =>
      padT + plotH - ((v - panel.minY) / Math.max(0.5, panel.maxY - panel.minY)) * plotH;

    const pathD = panel.values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`)
      .join(' ');

    const activeIdx = syncedHoverIdx ?? chronological.length - 1;
    const activeVal = panel.values[activeIdx];
    const activeRec = chronological[activeIdx];

    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xs font-bold text-[#0F172A]">{panel.title}</div>
          {activeRec && (
            <div className="font-mono text-xs font-semibold tabular-nums text-[#0F172A]">
              {activeVal.toFixed(panel.unit === 'ms' ? 2 : 1)} {panel.unit}
              <span className="ml-1.5 font-normal text-slate-400">{activeRec.weekLabel}</span>
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-2 h-auto w-full"
          onMouseLeave={() => setSyncedHoverIdx(null)}
          role="img"
          aria-label={`${panel.title} longitudinal clinician chart`}
        >
          {[panel.minY, (panel.minY + panel.maxY) / 2, panel.maxY].map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {tick.toFixed(panel.unit === 'ms' ? 1 : 0)}
                </text>
              </g>
            );
          })}

          {panel.refValue !== undefined && (
            <line
              x1={padL}
              y1={getY(panel.refValue)}
              x2={W - padR}
              y2={getY(panel.refValue)}
              stroke="#0D9488"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}

          <path d={pathD} fill="none" stroke={panel.stroke} strokeWidth="2.2" />

          {chronological.map((rec, i) => {
            const cx = getX(i);
            const cy = getY(panel.values[i]);
            const isActive = i === activeIdx;
            return (
              <g
                key={rec.id}
                onMouseEnter={() => setSyncedHoverIdx(i)}
                className="cursor-pointer"
              >
                {isActive && (
                  <line
                    x1={cx}
                    y1={padT}
                    x2={cx}
                    y2={H - padB}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 4.5 : 3}
                  fill="#FFFFFF"
                  stroke={panel.stroke}
                  strokeWidth="2"
                />
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor="middle"
                  fill={isActive ? '#0F172A' : '#94A3B8'}
                  fontSize="8.5"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {rec.weekLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Clinician Header & Hardware QA Verification Badge */}
      <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs font-semibold tracking-wide text-[#0D9488] uppercase">
              Neurophysiology Clinician Workstation
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-[#0F172A]">
              {patient.supervisor} · {patient.supervisorTitle}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Reviewing patient <span className="font-semibold text-[#0F172A]">{patient.name}</span> ({patient.mrn}) · {patient.clinic}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2.5 lg:items-end">
            {/* Hardware QA Verification Badge */}
            <div className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs font-semibold text-[#0F766E]">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Bench Load Verified — Tested on 1 kΩ skin phantom. Pulse clamp ≤ 0.20 ms.
              </span>
            </div>

            <div
              role="group"
              aria-label="Clinician Nerve Selection"
              className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1"
            >
              <button
                type="button"
                onClick={() => onSelectNerve('sural')}
                aria-pressed={activeNerve === 'sural'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                  activeNerve === 'sural' ? 'bg-[#0F172A] text-white' : 'text-slate-600'
                }`}
              >
                Sural (Calf)
              </button>
              <button
                type="button"
                onClick={() => onSelectNerve('median')}
                aria-pressed={activeNerve === 'median'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                  activeNerve === 'median' ? 'bg-[#0F172A] text-white' : 'text-slate-600'
                }`}
              >
                Median (Wrist)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Panel Synchronized Longitudinal Analytics */}
      <section aria-label="4-Panel Synchronized Longitudinal Analytics" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {renderSynchronizedPanel({
          title: 'NCV (Temp-Corrected)',
          unit: 'm/s',
          minY: 35,
          maxY: 56,
          values: chronological.map((r) => r.ncv),
          refValue: baseline.ncv,
          stroke: '#0D9488',
        })}
        {renderSynchronizedPanel({
          title: 'SNAP Amplitude',
          unit: 'μV',
          minY: 10,
          maxY: 28,
          values: chronological.map((r) => r.amplitude),
          refValue: baseline.amplitude,
          stroke: '#0F172A',
        })}
        {renderSynchronizedPanel({
          title: 'Onset Latency (t1)',
          unit: 'ms',
          minY: 2.2,
          maxY: 4.0,
          values: chronological.map((r) => r.onsetLatency),
          refValue: baseline.onsetLatency,
          stroke: '#0284C7',
        })}
        {renderSynchronizedPanel({
          title: 'Cutaneous Temp (TMP117)',
          unit: '°C',
          minY: 28,
          maxY: 36,
          values: chronological.map((r) => r.tempC),
          refValue: 32.0,
          stroke: '#D97706',
        })}
      </section>

      {/* Threshold Calibration Panel */}
      <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F172A]">
              <Sliders className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Threshold Calibration & Supervised Baseline Management
              </h2>
              <p className="text-xs text-slate-500">
                Current {baseline.label} Baseline: <span className="font-mono font-semibold text-[#0F172A]">{baseline.ncv.toFixed(1)} m/s</span> · <span className="font-mono font-semibold text-[#0F172A]">{baseline.amplitude.toFixed(1)} μV</span> (Locked {baseline.lockedDate})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                onUpdateThresholds({ cvReductionAlertPct: 10, ampReductionAlertPct: 20 })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleLockBaseline}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <Lock className="h-3.5 w-3.5 text-[#2DD4BF]" aria-hidden="true" />
              <span>Lock Latest as Baseline</span>
            </button>
          </div>
        </div>

        {baselineLockedNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-[#0F766E]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Supervised baseline updated and locked to latest scan values.</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="cv-threshold-slider" className="text-xs font-semibold text-[#0F172A]">
                CV Reduction Alert Threshold
              </label>
              <span className="font-mono text-sm font-bold tabular-nums text-[#0D9488]">
                ≥ {thresholds.cvReductionAlertPct}% drop (≤ {(baseline.ncv * (1 - thresholds.cvReductionAlertPct / 100)).toFixed(1)} m/s)
              </span>
            </div>
            <input
              id="cv-threshold-slider"
              type="range"
              min="5"
              max="25"
              step="1"
              value={thresholds.cvReductionAlertPct}
              onChange={(e) =>
                onUpdateThresholds({
                  ...thresholds,
                  cvReductionAlertPct: Number(e.target.value),
                })
              }
              className="mt-3 h-2 w-full cursor-pointer accent-[#0D9488]"
            />
          </div>

          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="amp-threshold-slider" className="text-xs font-semibold text-[#0F172A]">
                Amplitude Reduction Alert Threshold
              </label>
              <span className="font-mono text-sm font-bold tabular-nums text-amber-700">
                ≥ {thresholds.ampReductionAlertPct}% drop (≤ {(baseline.amplitude * (1 - thresholds.ampReductionAlertPct / 100)).toFixed(1)} μV)
              </span>
            </div>
            <input
              id="amp-threshold-slider"
              type="range"
              min="10"
              max="40"
              step="1"
              value={thresholds.ampReductionAlertPct}
              onChange={(e) =>
                onUpdateThresholds({
                  ...thresholds,
                  ampReductionAlertPct: Number(e.target.value),
                })
              }
              className="mt-3 h-2 w-full cursor-pointer accent-amber-600"
            />
          </div>
        </div>
      </section>

      {/* Full Longitudinal Table & Export */}
      <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF]">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              aria-label="Filter assessments by Test ID, date, or clinical note"
              placeholder="Search Test ID, date, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-60 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A] placeholder:text-slate-400 focus:border-[#0D9488] focus:outline-none"
            />

            <div className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1">
              {(['all', 'alert', 'nominal'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                    statusFilter === f ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {f === 'all' ? 'All Scans' : f === 'alert' ? 'Alerts / Watch' : 'Nominal'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-[#0D9488]" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => records[0] && onOpenReport(records[0])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5 text-[#2DD4BF]" aria-hidden="true" />
              <span>Print Clinical NCS Report</span>
            </button>
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
                <th className="px-4 py-3 text-right">Temp (°C)</th>
                <th className="px-4 py-3 text-right">Z (kΩ)</th>
                <th className="px-4 py-3">Alert Evaluation</th>
                <th className="px-5 py-3">Clinical Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    No assessment records match the active filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const evalRes = evaluateAlertStatus(rec, baseline, thresholds);
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => onOpenReport(rec)}
                      className="cursor-pointer transition-colors hover:bg-[#F8FAFC]"
                    >
                      <td className="px-5 py-3 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                        {rec.id}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {rec.date}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[#0F172A] whitespace-nowrap">
                        {rec.ncv.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[#0F172A] whitespace-nowrap">
                        {rec.amplitude.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {rec.onsetLatency.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {rec.tempC.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {rec.impedanceKOhm.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            evalRes.status === 'alert'
                              ? 'text-rose-700'
                              : evalRes.status === 'watch'
                              ? 'text-amber-700'
                              : 'text-[#0D9488]'
                          }`}
                        >
                          {evalRes.status === 'alert'
                            ? 'ALERT'
                            : evalRes.status === 'watch'
                            ? 'WATCH'
                            : 'NOMINAL'}
                        </span>
                        <span className="ml-2 text-slate-500">
                          {evalRes.cvChangePct}% CV / {evalRes.ampChangePct}% Amp
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3 text-slate-600">
                        {rec.notes}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
