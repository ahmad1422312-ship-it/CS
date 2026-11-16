import React, { useState } from 'react';
import type { AssessmentRecord, NerveBaseline, ThresholdConfig } from '../types/clinical';

interface TrendsTabProps {
  records: AssessmentRecord[];
  baseline: NerveBaseline;
  thresholds: ThresholdConfig;
}

export const TrendsTab: React.FC<TrendsTabProps> = ({
  records,
  baseline,
  thresholds,
}) => {
  const [useTempCorrected, setUseTempCorrected] = useState<boolean>(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Chronological order (oldest -> newest)
  const chronological = [...records].reverse();

  const ampAlertLine = Number(
    (baseline.amplitude * (1 - thresholds.ampReductionAlertPct / 100)).toFixed(1)
  );
  const ncvAlertLine = Number(
    (baseline.ncv * (1 - thresholds.cvReductionAlertPct / 100)).toFixed(1)
  );

  const renderLineChart = (config: {
    title: string;
    unit: string;
    minY: number;
    maxY: number;
    baselineY: number;
    alertY: number;
    alertLabel: string;
    values: number[];
    strokeColor: string;
  }) => {
    const W = 540;
    const H = 240;
    const padL = 48;
    const padR = 20;
    const padT = 22;
    const padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const getX = (i: number) =>
      chronological.length <= 1
        ? padL + plotW / 2
        : padL + (i / (chronological.length - 1)) * plotW;

    const getY = (val: number) =>
      padT +
      plotH -
      ((val - config.minY) / Math.max(1, config.maxY - config.minY)) * plotH;

    const pathD = config.values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`)
      .join(' ');

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) =>
      Number((config.minY + frac * (config.maxY - config.minY)).toFixed(1))
    );

    const activeIdx = hoveredIdx ?? chronological.length - 1;
    const activeRec = chronological[activeIdx];
    const activeVal = config.values[activeIdx];

    return (
      <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">{config.title}</h3>
            <p className="text-xs text-slate-500">
              8-week longitudinal trend vs. supervised baseline ({config.baselineY} {config.unit})
            </p>
          </div>
          {activeRec && (
            <div className="text-right">
              <div className="font-mono text-sm font-bold tabular-nums text-[#0F172A]">
                {activeVal.toFixed(1)} {config.unit}
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                {activeRec.id} · {activeRec.weekLabel}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            onMouseLeave={() => setHoveredIdx(null)}
            role="img"
            aria-label={`${config.title} longitudinal trend chart`}
          >
            {/* Y Grid & Ticks */}
            {yTicks.map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748B"
                    fontSize="10"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Baseline Dashed Line */}
            <line
              x1={padL}
              y1={getY(config.baselineY)}
              x2={W - padR}
              y2={getY(config.baselineY)}
              stroke="#0D9488"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text
              x={W - padR}
              y={getY(config.baselineY) - 5}
              textAnchor="end"
              fill="#0D9488"
              fontSize="10"
              fontWeight="600"
              fontFamily="IBM Plex Mono, monospace"
            >
              Baseline {config.baselineY}
            </text>

            {/* Alert Threshold Dashed Line */}
            <line
              x1={padL}
              y1={getY(config.alertY)}
              x2={W - padR}
              y2={getY(config.alertY)}
              stroke="#D97706"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={W - padR}
              y={getY(config.alertY) - 5}
              textAnchor="end"
              fill="#B45309"
              fontSize="10"
              fontWeight="600"
              fontFamily="IBM Plex Mono, monospace"
            >
              {config.alertLabel} ({config.alertY})
            </text>

            {/* Data Line */}
            <path
              d={pathD}
              fill="none"
              stroke={config.strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Data Points & Week Labels */}
            {chronological.map((rec, i) => {
              const cx = getX(i);
              const cy = getY(config.values[i]);
              const isColdCorrected = rec.tempCorrected && !useTempCorrected;
              const isHovered = activeIdx === i;

              return (
                <g
                  key={rec.id}
                  onMouseEnter={() => setHoveredIdx(i)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 4}
                    fill={isColdCorrected ? '#D97706' : '#FFFFFF'}
                    stroke={isColdCorrected ? '#B45309' : config.strokeColor}
                    strokeWidth="2.2"
                  />
                  <text
                    x={cx}
                    y={H - 10}
                    textAnchor="middle"
                    fill={isHovered ? '#0F172A' : '#64748B'}
                    fontWeight={isHovered ? '700' : '500'}
                    fontSize="10"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {rec.weekLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">
            8-Week Longitudinal Neuropathy Trends — {baseline.label}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Compare temperature-normalized velocities (TMP117 active) against raw uncorrected readings to isolate true axonal/myelin change from cold-skin slowing.
          </p>
        </div>

        <div
          role="group"
          aria-label="Temperature Normalization Mode"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setUseTempCorrected(true)}
            aria-pressed={useTempCorrected}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              useTempCorrected
                ? 'bg-[#0D9488] text-white'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            Temperature-Corrected
          </button>
          <button
            type="button"
            onClick={() => setUseTempCorrected(false)}
            aria-pressed={!useTempCorrected}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              !useTempCorrected
                ? 'bg-[#0F172A] text-white'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            Raw Uncorrected
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderLineChart({
          title: 'SNAP Amplitude (μV)',
          unit: 'μV',
          minY: 10,
          maxY: Math.max(28, Math.ceil(baseline.amplitude + 4)),
          baselineY: baseline.amplitude,
          alertY: ampAlertLine,
          alertLabel: `-${thresholds.ampReductionAlertPct}% Alert`,
          values: chronological.map((r) => r.amplitude),
          strokeColor: '#0F172A',
        })}

        {renderLineChart({
          title: useTempCorrected
            ? 'Conduction Velocity — Temperature-Corrected (m/s)'
            : 'Conduction Velocity — Raw Uncorrected (m/s)',
          unit: 'm/s',
          minY: 36,
          maxY: Math.max(56, Math.ceil(baseline.ncv + 4)),
          baselineY: baseline.ncv,
          alertY: ncvAlertLine,
          alertLabel: `-${thresholds.cvReductionAlertPct}% Alert`,
          values: chronological.map((r) => (useTempCorrected ? r.ncv : r.rawNcv)),
          strokeColor: '#0D9488',
        })}
      </div>
    </div>
  );
};
