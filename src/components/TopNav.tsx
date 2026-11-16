import React from 'react';
import { Activity, Bluetooth, BluetoothOff, Play, ShieldAlert } from 'lucide-react';
import type { DeviceState, PatientProfile, WorkspaceMode } from '../types/clinical';

interface TopNavProps {
  patient: PatientProfile;
  workspace: WorkspaceMode;
  onSelectWorkspace: (mode: WorkspaceMode) => void;
  device: DeviceState;
  onStartAssessment: () => void;
}

const WORKSPACE_MODES: { id: WorkspaceMode; label: string }[] = [
  { id: 'patient', label: 'Patient Portal' },
  { id: 'clinician', label: 'Clinician View' },
  { id: 'device', label: 'Device & BLE Bridge' },
];

export const TopNav: React.FC<TopNavProps> = ({
  patient,
  workspace,
  onSelectWorkspace,
  device,
  onStartAssessment,
}) => {
  const statusText = !device.connected
    ? 'Patch Disconnected'
    : device.chargingInterlock
    ? `Charging Lockout · ${device.batteryPct}%`
    : `BLE Connected · ${device.batteryPct}%`;

  return (
    <header className="no-print sticky top-0 z-30 border-b border-[#E2E8F0] bg-[#FFFFFF]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-6">
        {/* Left: Brand + Active Patient Badge */}
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F172A] text-white">
              <Activity className="h-5 w-5 text-[#2DD4BF]" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight text-[#0F172A] whitespace-nowrap">
                NerveTrace PATCH
              </div>
              <div className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                Wireless Peripheral NCS
              </div>
            </div>
          </div>

          <div
            className="hidden h-8 w-px bg-[#E2E8F0] md:block"
            aria-hidden="true"
          />

          <div className="hidden min-w-0 leading-tight md:block">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-[#0F172A] whitespace-nowrap">
                {patient.name}
              </span>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span className="font-mono tabular-nums text-slate-700 whitespace-nowrap">
                MRN: {patient.mrn}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 whitespace-nowrap">
              Supervised by {patient.supervisor}
            </div>
          </div>
        </div>

        {/* Center: Primary 3-Mode Workspace Switcher */}
        <nav
          aria-label="Primary Workspace Modes"
          className="order-3 flex w-full items-center justify-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1 lg:order-2 lg:w-auto"
        >
          {WORKSPACE_MODES.map((mode) => {
            const active = workspace === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectWorkspace(mode.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488] lg:flex-initial ${
                  active
                    ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs ring-1 ring-[#E2E8F0]'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Hardware Status Pill + Start Assessment CTA */}
        <div className="order-2 flex shrink-0 items-center gap-3 lg:order-3">
          <button
            type="button"
            onClick={() => onSelectWorkspace('device')}
            title="Inspect hardware telemetry & BLE connection"
            className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 sm:inline-flex ${
              !device.connected
                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : device.chargingInterlock
                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-teal-200 bg-teal-50/80 text-[#0F766E] hover:bg-teal-100/70'
            }`}
          >
            {!device.connected ? (
              <BluetoothOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : device.chargingInterlock ? (
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Bluetooth className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="font-mono tabular-nums">{statusText}</span>
          </button>

          <button
            type="button"
            onClick={onStartAssessment}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D9488] whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5 fill-current text-[#2DD4BF]" aria-hidden="true" />
            <span>Start Assessment</span>
          </button>
        </div>
      </div>

      {/* Compact Patient Context Ribbon on narrow viewports */}
      <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-1.5 text-[11px] text-slate-600 md:hidden">
        <span className="font-semibold text-[#0F172A] truncate">
          {patient.name} · {patient.mrn}
        </span>
        <span className="truncate text-slate-500">{patient.supervisor}</span>
      </div>
    </header>
  );
};
