import React from 'react';
import { Printer, ShieldCheck, X } from 'lucide-react';
import type {
  AssessmentRecord,
  NerveBaseline,
  PatientProfile,
  ThresholdConfig,
} from '../types/clinical';
import { evaluateAlertStatus } from '../utils/neuroMath';

interface NcsReportModalProps {
  record: AssessmentRecord | null;
  patient: PatientProfile;
  baseline: NerveBaseline;
  thresholds: ThresholdConfig;
  onClose: () => void;
}

export const NcsReportModal: React.FC<NcsReportModalProps> = ({
  record,
  patient,
  baseline,
  thresholds,
  onClose,
}) => {
  if (!record) return null;

  const evalRes = evaluateAlertStatus(record, baseline, thresholds);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ncs-report-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-xl">
        {/* Top Action Bar */}
        <div className="no-print flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
            <ShieldCheck className="h-4 w-4 text-[#0D9488]" aria-hidden="true" />
            <span>Formal Clinical NCS Study Report · IEC 60601-2-40 Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5 text-[#2DD4BF]" aria-hidden="true" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Clinical NCS Study Report"
              className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-1.5 text-slate-500 hover:text-[#0F172A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row">
            <div>
              <h2 id="ncs-report-title" className="text-xl font-bold text-[#0F172A]">
                NerveTrace PATCH — Clinical NCS Study Report
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{patient.clinic}</p>
            </div>
            <div className="text-left font-mono text-xs sm:text-right">
              <div className="font-bold text-[#0F172A]">Study ID: {record.id}</div>
              <div className="text-slate-600">Date: {record.date} ({record.weekLabel})</div>
              <div className="text-[#0D9488]">Standard: IEC 60601-2-40</div>
            </div>
          </div>

          {/* Patient & Study Metadata */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs sm:grid-cols-2">
            <div className="space-y-1">
              <div className="font-semibold text-slate-500">Patient Demographics</div>
              <div className="font-bold text-[#0F172A]">{patient.name}</div>
              <div className="font-mono text-slate-700">
                MRN: {patient.mrn} · Age {patient.age} · DOB {patient.dob}
              </div>
              <div className="text-slate-600">{patient.condition}</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-500">Protocol & Recording Geometry</div>
              <div className="font-bold text-[#0F172A]">{baseline.label}</div>
              <div className="text-slate-700">{baseline.anatomicalSite}</div>
              <div className="font-mono text-slate-600">
                Stim→R1: {baseline.electrodeDistanceCm} cm · Δd: {baseline.interRecordingMm} mm · {record.sweepsAveraged} sweeps
              </div>
            </div>
          </div>

          {/* Quantitative NCS Measurements Table */}
          <div>
            <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
              Quantitative Electrodiagnostic Findings
            </h3>
            <table className="w-full border-collapse border border-[#E2E8F0] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-slate-600">
                  <th className="px-4 py-2.5">Parameter</th>
                  <th className="px-4 py-2.5 text-right">Measured Value</th>
                  <th className="px-4 py-2.5 text-right">Supervised Baseline</th>
                  <th className="px-4 py-2.5 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono tabular-nums">
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-[#0F172A]">
                    Conduction Velocity (NCV)
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#0F172A]">
                    {record.ncv.toFixed(1)} m/s
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {baseline.ncv.toFixed(1)} m/s
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-700">
                    {evalRes.cvChangePct > 0 ? `+${evalRes.cvChangePct}` : evalRes.cvChangePct}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-[#0F172A]">
                    SNAP Amplitude (Peak-to-Peak)
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#0F172A]">
                    {record.amplitude.toFixed(1)} μV
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {baseline.amplitude.toFixed(1)} μV
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-rose-700">
                    {evalRes.ampChangePct > 0 ? `+${evalRes.ampChangePct}` : evalRes.ampChangePct}%
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-[#0F172A]">
                    Onset Latency (t1) / Peak
                  </td>
                  <td className="px-4 py-2.5 text-right text-[#0F172A]">
                    {record.onsetLatency.toFixed(2)} ms / {record.peakLatency.toFixed(2)} ms
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {baseline.onsetLatency.toFixed(2)} ms / {baseline.peakLatency.toFixed(2)} ms
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    Δt {record.deltaT.toFixed(2)} ms
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-sans font-semibold text-[#0F172A]">
                    Cutaneous Temp (TMP117)
                  </td>
                  <td className="px-4 py-2.5 text-right text-[#0F172A]">
                    {record.tempC.toFixed(1)} °C
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">≥ 32.0 °C</td>
                  <td className="px-4 py-2.5 text-right text-[#0D9488]">
                    {record.tempCorrected
                      ? `Normalized from ${record.rawNcv.toFixed(1)} m/s`
                      : 'Optimal'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Hardware & Clinical Interpretation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <div className="font-bold text-[#0F172A]">Hardware Acquisition Telemetry</div>
              <div className="mt-2 space-y-1 font-mono text-slate-600">
                <div>Stimulus: {record.stimCurrentMa} mA · {record.pulseWidthMs.toFixed(2)} ms (Clamp ≤ 0.20 ms)</div>
                <div>Skin Impedance: {record.impedanceKOhm.toFixed(1)} kΩ (&lt; 10.0 kΩ pass)</div>
                <div>IMU Stillness: {record.imuMotionG.toFixed(3)} g · Rejected: {record.sweepsRejected}</div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] p-4">
              <div className="font-bold text-[#0F172A]">Clinical Summary & Sign-Off</div>
              <p className="mt-2 leading-relaxed text-slate-700">{record.notes}</p>
              <div className="mt-3 border-t border-[#E2E8F0] pt-2 text-[11px] text-slate-500">
                Supervising Physician: <span className="font-semibold text-[#0F172A]">{patient.supervisor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
