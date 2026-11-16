import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { AssessmentRecord, NerveBaseline } from '../types/clinical';
import {
  calculateNCV,
  generateSnapWaveform,
  INTER_RECORDING_DISTANCE_MM,
} from '../utils/neuroMath';

interface WaveformsTabProps {
  records: AssessmentRecord[];
  baseline: NerveBaseline;
}

const SVG_WIDTH = 920;
const SVG_HEIGHT = 400;
const PAD_LEFT = 64;
const PAD_RIGHT = 28;
const PAD_TOP = 32;
const PAD_BOTTOM = 44;
const PLOT_W = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
const MAX_T_MS = 8.0;

export const WaveformsTab: React.FC<WaveformsTabProps> = ({
  records,
  baseline,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    records[0]?.id ?? ''
  );

  const selectedRecord =
    records.find((r) => r.id === selectedRecordId) ?? records[0];

  const [t1, setT1] = useState<number>(selectedRecord?.onsetLatency ?? 3.48);
  const [t2, setT2] = useState<number>(
    Number(
      ((selectedRecord?.onsetLatency ?? 3.48) + (selectedRecord?.deltaT ?? 0.66)).toFixed(2)
    )
  );
  const [draggingCaliper, setDraggingCaliper] = useState<'t1' | 't2' | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (selectedRecord) {
      setT1(selectedRecord.onsetLatency);
      setT2(Number((selectedRecord.onsetLatency + selectedRecord.deltaT).toFixed(2)));
    }
  }, [selectedRecord?.id]);

  const waveform = useMemo(() => {
    return generateSnapWaveform({
      onsetLatencyMs: selectedRecord?.onsetLatency ?? 3.48,
      deltaTMs: selectedRecord?.deltaT ?? 0.66,
      amplitudeUv: selectedRecord?.amplitude ?? 13.4,
      durationMs: MAX_T_MS,
      stepMs: 0.05,
    });
  }, [selectedRecord]);

  const deltaT = Math.max(0.1, Number((t2 - t1).toFixed(2)));
  const calculatedCv = calculateNCV(INTER_RECORDING_DISTANCE_MM, deltaT);

  const xForT = (tMs: number) => PAD_LEFT + (tMs / MAX_T_MS) * PLOT_W;
  const yForR1 = (uv: number) => PAD_TOP + PLOT_H * 0.28 - uv * 4.2;
  const yForR2 = (uv: number) => PAD_TOP + PLOT_H * 0.72 - uv * 4.2;

  const r1Path = useMemo(() => {
    return waveform
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xForT(pt.tMs).toFixed(1)} ${yForR1(pt.r1Uv).toFixed(1)}`)
      .join(' ');
  }, [waveform]);

  const r2Path = useMemo(() => {
    return waveform
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xForT(pt.tMs).toFixed(1)} ${yForR2(pt.r2Uv).toFixed(1)}`)
      .join(' ');
  }, [waveform]);

  const updateCaliperFromClientX = (clientX: number, which: 't1' | 't2') => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * SVG_WIDTH;
    const rawT = ((relX - PAD_LEFT) / PLOT_W) * MAX_T_MS;
    const clamped = Number(Math.min(7.5, Math.max(1.3, rawT)).toFixed(2));
    if (which === 't1') {
      const safeT1 = Math.min(clamped, Number((t2 - 0.25).toFixed(2)));
      setT1(Math.max(1.3, safeT1));
    } else {
      const safeT2 = Math.max(clamped, Number((t1 + 0.25).toFixed(2)));
      setT2(Math.min(7.5, safeT2));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingCaliper) return;
    updateCaliperFromClientX(e.clientX, draggingCaliper);
  };

  const handleResetCalipers = () => {
    if (!selectedRecord) return;
    setT1(selectedRecord.onsetLatency);
    setT2(Number((selectedRecord.onsetLatency + selectedRecord.deltaT).toFixed(2)));
  };

  const blankWidthPx = xForT(1.2) - PAD_LEFT;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">
              Dual-Channel Biopotential Oscilloscope — {baseline.label}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              INA333 Instrumentation Amplifier + ADS8866 16-bit SAR ADC · 16-Sweep Averaged SNAP · Drag calipers t1 / t2 or use sliders to recalculate CV
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="waveform-record-select" className="text-xs font-medium text-slate-600">
              Scan:
            </label>
            <select
              id="waveform-record-select"
              value={selectedRecord?.id ?? ''}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 font-mono text-xs font-semibold text-[#0F172A] focus:border-[#0D9488] focus:outline-none"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} ({r.date})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleResetCalipers}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Calipers</span>
            </button>
          </div>
        </div>

        {/* Live Recalculated Caliper Readout Bar */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 sm:grid-cols-5">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Onset Caliper t1</div>
            <div className="font-mono text-base font-bold tabular-nums text-[#0F172A]">
              {t1.toFixed(2)} ms
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Distal Caliper t2</div>
            <div className="font-mono text-base font-bold tabular-nums text-[#0D9488]">
              {t2.toFixed(2)} ms
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Transit Delta (Δt)</div>
            <div className="font-mono text-base font-bold tabular-nums text-[#0F172A]" data-testid="caliper-delta-t">
              {deltaT.toFixed(2)} ms
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Fixed Spacing (Δd)</div>
            <div className="font-mono text-base font-bold tabular-nums text-slate-700">
              {INTER_RECORDING_DISTANCE_MM} mm
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-[11px] font-medium text-slate-500">Live CV = 30mm / Δt</div>
            <div className="font-mono text-base font-bold tabular-nums text-[#0D9488]" data-testid="caliper-cv">
              {calculatedCv.toFixed(1)} m/s
            </div>
          </div>
        </div>

        {/* Interactive Dual-Channel SVG Oscilloscope */}
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-800 bg-[#0B1120]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="h-auto w-full select-none touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDraggingCaliper(null)}
            onPointerLeave={() => setDraggingCaliper(null)}
            role="img"
            aria-label="Dual-channel SNAP oscilloscope waveform with interactive t1 and t2 onset calipers"
          >
            {/* Grid Lines */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((ms) => {
              const x = xForT(ms);
              return (
                <g key={ms}>
                  <line
                    x1={x}
                    y1={PAD_TOP}
                    x2={x}
                    y2={SVG_HEIGHT - PAD_BOTTOM}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray={ms % 2 === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={x}
                    y={SVG_HEIGHT - 16}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="11"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {ms.toFixed(1)} ms
                  </text>
                </g>
              );
            })}

            {/* Channel Baselines */}
            <line
              x1={PAD_LEFT}
              y1={yForR1(0)}
              x2={SVG_WIDTH - PAD_RIGHT}
              y2={yForR1(0)}
              stroke="#334155"
              strokeWidth="1"
            />
            <line
              x1={PAD_LEFT}
              y1={yForR2(0)}
              x2={SVG_WIDTH - PAD_RIGHT}
              y2={yForR2(0)}
              stroke="#334155"
              strokeWidth="1"
            />

            {/* Channel Labels */}
            <text
              x={xForT(1.32)}
              y={PAD_TOP + 18}
              fill="#38BDF8"
              fontSize="12"
              fontWeight="600"
              fontFamily="IBM Plex Mono, monospace"
            >
              CH1 · Site 1 R1 (Proximal)
            </text>
            <text
              x={xForT(1.32)}
              y={PAD_TOP + PLOT_H * 0.5 + 18}
              fill="#2DD4BF"
              fontSize="12"
              fontWeight="600"
              fontFamily="IBM Plex Mono, monospace"
            >
              CH2 · Site 2 +30mm (Distal)
            </text>

            {/* Stimulus Blanking Window (0.0 - 1.2 ms) */}
            <rect
              x={PAD_LEFT}
              y={PAD_TOP}
              width={blankWidthPx}
              height={PLOT_H}
              fill="#F59E0B"
              fillOpacity="0.12"
            />
            <line
              x1={PAD_LEFT + blankWidthPx}
              y1={PAD_TOP}
              x2={PAD_LEFT + blankWidthPx}
              y2={SVG_HEIGHT - PAD_BOTTOM}
              stroke="#F59E0B"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={PAD_LEFT + blankWidthPx / 2}
              y={PAD_TOP + PLOT_H / 2}
              textAnchor="middle"
              fill="#FBBF24"
              fontSize="12"
              fontWeight="700"
              fontFamily="IBM Plex Mono, monospace"
            >
              BLANK
            </text>

            {/* Waveform Curves */}
            <path d={r1Path} fill="none" stroke="#38BDF8" strokeWidth="2.4" />
            <path d={r2Path} fill="none" stroke="#2DD4BF" strokeWidth="2.4" />

            {/* Δt Interval Span */}
            <line
              x1={xForT(t1)}
              y1={PAD_TOP + 28}
              x2={xForT(t2)}
              y2={PAD_TOP + 28}
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
            <text
              x={(xForT(t1) + xForT(t2)) / 2}
              y={PAD_TOP + 22}
              textAnchor="middle"
              fill="#F8FAFC"
              fontSize="11"
              fontWeight="600"
              fontFamily="IBM Plex Mono, monospace"
            >
              Δt = {deltaT.toFixed(2)} ms
            </text>

            {/* Draggable Caliper t1 */}
            <g
              className="cursor-ew-resize"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setDraggingCaliper('t1');
              }}
            >
              <line
                x1={xForT(t1)}
                y1={PAD_TOP}
                x2={xForT(t1)}
                y2={SVG_HEIGHT - PAD_BOTTOM}
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <rect
                x={xForT(t1) - 18}
                y={PAD_TOP - 22}
                width="36"
                height="20"
                rx="4"
                fill="#0284C7"
              />
              <text
                x={xForT(t1)}
                y={PAD_TOP - 8}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                t1
              </text>
            </g>

            {/* Draggable Caliper t2 */}
            <g
              className="cursor-ew-resize"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setDraggingCaliper('t2');
              }}
            >
              <line
                x1={xForT(t2)}
                y1={PAD_TOP}
                x2={xForT(t2)}
                y2={SVG_HEIGHT - PAD_BOTTOM}
                stroke="#2DD4BF"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <rect
                x={xForT(t2) - 18}
                y={PAD_TOP - 22}
                width="36"
                height="20"
                rx="4"
                fill="#0D9488"
              />
              <text
                x={xForT(t2)}
                y={PAD_TOP - 8}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                t2
              </text>
            </g>
          </svg>
        </div>

        {/* Fine-Tuning Caliper Sliders */}
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
              <label htmlFor="caliper-t1-slider" className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0284C7]" aria-hidden="true" />
                <span>Adjust Caliper t1 (Site 1 R1 Onset)</span>
              </label>
              <span className="font-mono tabular-nums text-[#0284C7]">{t1.toFixed(2)} ms</span>
            </div>
            <input
              id="caliper-t1-slider"
              type="range"
              min="1.30"
              max={Math.max(1.35, Number((t2 - 0.25).toFixed(2)))}
              step="0.01"
              value={t1}
              onChange={(e) => setT1(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-[#0284C7]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
              <label htmlFor="caliper-t2-slider" className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0D9488]" aria-hidden="true" />
                <span>Adjust Caliper t2 (Site 2 +30mm Onset)</span>
              </label>
              <span className="font-mono tabular-nums text-[#0D9488]">{t2.toFixed(2)} ms</span>
            </div>
            <input
              id="caliper-t2-slider"
              type="range"
              min={Math.min(7.45, Number((t1 + 0.25).toFixed(2)))}
              max="7.50"
              step="0.01"
              value={t2}
              onChange={(e) => setT2(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-[#0D9488]"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
