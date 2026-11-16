import React from 'react';
import { AlertOctagon, ShieldCheck, ZapOff } from 'lucide-react';
import type { PatientProfile } from '../types/clinical';

interface ProtocolsTabProps {
  patient: PatientProfile;
}

export const ProtocolsTab: React.FC<ProtocolsTabProps> = ({ patient }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Safety Contraindications */}
        <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <AlertOctagon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Safety Contraindications & Hardware Lockouts
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                IEC 60601-2-40 Nerve & Muscle Stimulator Compliance
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3 text-sm text-slate-700">
            <li className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="font-semibold text-[#0F172A]">
                No Active Implanted Cardiac Devices
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Strictly contraindicated for patients with cardiac pacemakers, implantable cardioverter-defibrillators (ICDs), or implanted neurostimulators.
              </p>
            </li>
            <li className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="font-semibold text-[#0F172A]">
                Skin Integrity Verification
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Do not place hydrogel electrodes over broken, ulcerated, infected, or acutely irritated skin. Inspect site prior to every session.
              </p>
            </li>
            <li className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="font-semibold text-[#0F172A]">
                No Transthoracic Current Pathways
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Never apply stimulation or return electrodes across the chest, neck, or head. Restrict placement strictly to unilateral distal limb protocols (Sural calf or Median wrist).
              </p>
            </li>
            <li className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="font-semibold text-[#0F172A]">
                Hardware Charging Safety Interlock
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                LT8365 high-voltage stimulation rail is physically locked out whenever USB-C or Qi wireless charging is detected.
              </p>
            </li>
          </ul>
        </section>

        {/* Clinical Scope Disclaimer & Electrical Limits */}
        <section className="space-y-6">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0D9488]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Clinical Scope & Intended Use Disclaimer
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Supervised Outpatient Surveillance Aid
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              NerveTrace PATCH is designed exclusively as a longitudinal home/outpatient nerve-conduction monitoring aid under physician supervision ({patient.supervisor}). It complements rather than replaces formal in-clinic diagnostic electrodiagnostic nerve conduction studies (NCS) and needle electromyography (EMG).
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              All automated threshold alerts indicate deviation relative to the patient&apos;s personal supervised baseline and require clinical correlation before modifying therapy.
            </p>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0F172A]">
                <ZapOff className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Hardware Output & Signal Clamping Limits
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  IEC 60601-2-40 & Bench Phantom Verification
                </p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <dt className="text-slate-500">Max Stimulus Current</dt>
                <dd className="mt-1 font-mono font-bold tabular-nums text-[#0F172A]">
                  0 – 40 mA (Constant Current)
                </dd>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <dt className="text-slate-500">Hardware Pulse Clamp</dt>
                <dd className="mt-1 font-mono font-bold tabular-nums text-[#0F172A]">
                  ≤ 0.20 ms Monophasic
                </dd>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <dt className="text-slate-500">Impedance Gate</dt>
                <dd className="mt-1 font-mono font-bold tabular-nums text-[#0F172A]">
                  &lt; 10.0 kΩ Mandatory
                </dd>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <dt className="text-slate-500">IMU Motion Gate</dt>
                <dd className="mt-1 font-mono font-bold tabular-nums text-[#0F172A]">
                  &lt; 0.05 g Sweep Rejection
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
};
