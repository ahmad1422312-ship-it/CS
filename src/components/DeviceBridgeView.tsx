import React, { useState } from 'react';
import {
  Activity,
  BatteryCharging,
  Bluetooth,
  Cpu,
  Pause,
  Play,
  Radio,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type { DeviceState, TelemetryLogEntry } from '../types/clinical';
import { evaluatePreChecks } from '../utils/neuroMath';

interface DeviceBridgeViewProps {
  device: DeviceState;
  onUpdateDevice: (patch: Partial<DeviceState>, logNote?: string) => void;
  telemetryLog: TelemetryLogEntry[];
  onAppendLog: (entry: Omit<TelemetryLogEntry, 'id' | 'timestamp'>) => void;
  onClearLog: () => void;
  onStartAssessment: () => void;
}

export const DeviceBridgeView: React.FC<DeviceBridgeViewProps> = ({
  device,
  onUpdateDevice,
  telemetryLog,
  onAppendLog,
  onClearLog,
  onStartAssessment,
}) => {
  const [bleConnecting, setBleConnecting] = useState(false);
  const [streamPaused, setStreamPaused] = useState(false);

  const preCheckSummary = evaluatePreChecks(device);

  const handleWebBluetoothConnect = async () => {
    setBleConnecting(true);
    const nav = navigator as Navigator & {
      bluetooth?: {
        requestDevice: (opts: {
          acceptAllDevices?: boolean;
          optionalServices?: string[];
        }) => Promise<{ name?: string; gatt?: { connect: () => Promise<unknown> } }>;
      };
    };

    if (!nav.bluetooth) {
      onUpdateDevice(
        {
          bleMode: 'simulator',
          connected: true,
          lastError:
            'Web Bluetooth API unavailable in this browser context; Live Hardware Simulator remains active.',
        },
        'Web Bluetooth unavailable · Hardware Simulator active'
      );
      setBleConnecting(false);
      return;
    }

    try {
      const bleDevice = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });
      await bleDevice.gatt?.connect();
      onUpdateDevice({
        bleMode: 'web-bluetooth',
        connected: true,
        deviceName: bleDevice.name || 'NerveTrace-XIAO-nRF52840',
        lastError: null,
      });
      onAppendLog({
        direction: 'SYS',
        packetHex: '0xAA 0x10 0x01 0xFF',
        decoded: `GATT Connected via Web Bluetooth to ${bleDevice.name || 'NerveTrace Patch'}`,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Bluetooth device selection cancelled.';
      onUpdateDevice({
        bleMode: 'simulator',
        connected: true,
        lastError: `${msg} Continuing on Live Hardware Simulator.`,
      });
      onAppendLog({
        direction: 'SYS',
        packetHex: '0xAA 0xE1 0x00',
        decoded: `Web Bluetooth prompt dismissed (${msg}) · Simulator bridge retained`,
      });
    } finally {
      setBleConnecting(false);
    }
  };

  const applyScenario = (
    scenario: 'optimal' | 'cold' | 'motion' | 'charging'
  ) => {
    if (scenario === 'optimal') {
      onUpdateDevice(
        {
          connected: true,
          impedanceKOhm: 4.2,
          skinTempC: 33.0,
          imuMotionG: 0.012,
          chargingInterlock: false,
          batteryPct: 88,
          lastError: null,
        },
        'Preset Applied: Normal Optimal Skin (Z=4.2kΩ, T=33.0°C, IMU=0.012g, Chg=OFF)'
      );
    } else if (scenario === 'cold') {
      onUpdateDevice(
        {
          connected: true,
          impedanceKOhm: 4.9,
          skinTempC: 29.6,
          imuMotionG: 0.015,
          chargingInterlock: false,
          lastError: null,
        },
        'Preset Applied: Cold Extremity 29.6°C (TMP117 Pre-check Warning Active)'
      );
    } else if (scenario === 'motion') {
      onUpdateDevice(
        {
          connected: true,
          impedanceKOhm: 4.4,
          skinTempC: 32.8,
          imuMotionG: 0.145,
          chargingInterlock: false,
          lastError: null,
        },
        'Preset Applied: Motion Artifact Detected (IMU=0.145g > 0.050g threshold)'
      );
    } else {
      onUpdateDevice(
        {
          connected: true,
          impedanceKOhm: 4.1,
          skinTempC: 33.1,
          imuMotionG: 0.01,
          chargingInterlock: true,
          batteryPct: 92,
          lastError: null,
        },
        'Preset Applied: Charging Safety Lockout (USB-C / Qi Active · LT8365 Inhibited)'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Hardware Architecture & Web Bluetooth Header */}
      <section className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F172A] text-[#2DD4BF]">
              <Cpu className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0F172A] sm:text-xl">
                Device & BLE Bridge — Seeed XIAO nRF52840 Sense
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                LT8365 Constant-Current Stimulator · INA333 + ADS8866 16-bit Front-End · TMP117 Thermistor · Onboard 6-Axis IMU
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleWebBluetoothConnect}
              disabled={bleConnecting}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Bluetooth className="h-3.5 w-3.5 text-[#0D9488]" aria-hidden="true" />
              <span>{bleConnecting ? 'Scanning BLE...' : 'Connect Web Bluetooth'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateDevice(
                  { connected: !device.connected, bleMode: 'simulator' },
                  !device.connected
                    ? 'Hardware Simulator Connected'
                    : 'Hardware Simulator Disconnected'
                )
              }
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                device.connected
                  ? 'bg-[#0D9488] text-white hover:bg-[#0F766E]'
                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
              }`}
            >
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {device.connected ? 'Live Simulator: Online' : 'Live Simulator: Offline'}
              </span>
            </button>

            <button
              type="button"
              onClick={onStartAssessment}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5 fill-current text-[#2DD4BF]" aria-hidden="true" />
              <span>Test in Assessment</span>
            </button>
          </div>
        </div>

        {device.lastError && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-[#F8FAFC] px-4 py-2.5 text-xs text-slate-600">
            {device.lastError}
          </div>
        )}

        {/* Quick Test Scenarios */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Quick Test Scenarios (Syncs Live With Guided Assessment Pre-Checks)
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => applyScenario('optimal')}
              className="rounded-lg border border-teal-200 bg-teal-50/70 px-3.5 py-2 text-xs font-semibold text-[#0F766E] transition-colors hover:bg-teal-100/70 whitespace-nowrap"
            >
              Normal Optimal Skin
            </button>
            <button
              type="button"
              onClick={() => applyScenario('cold')}
              className="rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100/70 whitespace-nowrap"
            >
              Cold Extremity 29.6°C
            </button>
            <button
              type="button"
              onClick={() => applyScenario('motion')}
              className="rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100/70 whitespace-nowrap"
            >
              Motion Artifact Detected
            </button>
            <button
              type="button"
              onClick={() => applyScenario('charging')}
              className="rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100/70 whitespace-nowrap"
            >
              Charging Safety Lockout
            </button>
          </div>
        </div>
      </section>

      {/* Main Split: Interactive Sensor/Safety Controls + Live Pre-Check Gate & Telemetry */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Sensor & Safety Controls (6 cols) */}
        <section className="space-y-5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 sm:p-6 lg:col-span-6">
          <h2 className="text-base font-bold text-[#0F172A]">
            Interactive Sensor & Safety Interlock Controls
          </h2>

          {/* Contact Impedance */}
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label htmlFor="sim-impedance" className="text-[#0F172A]">
                Contact Impedance (Pass &lt; 10.0 kΩ)
              </label>
              <span
                className={`font-mono tabular-nums ${
                  device.impedanceKOhm < 10 ? 'text-[#0D9488]' : 'text-rose-700'
                }`}
              >
                {device.impedanceKOhm.toFixed(1)} kΩ
              </span>
            </div>
            <input
              id="sim-impedance"
              type="range"
              min="1.5"
              max="18.0"
              step="0.1"
              value={device.impedanceKOhm}
              onChange={(e) =>
                onUpdateDevice(
                  { impedanceKOhm: Number(e.target.value) },
                  `Z_skin updated to ${Number(e.target.value).toFixed(1)} kΩ`
                )
              }
              className="mt-2 h-2 w-full cursor-pointer accent-[#0D9488]"
            />
          </div>

          {/* Skin Temperature */}
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label htmlFor="sim-temp" className="text-[#0F172A]">
                Cutaneous Temp TMP117 (Optimal ≥ 32.0°C)
              </label>
              <span
                className={`font-mono tabular-nums ${
                  device.skinTempC >= 32.0 ? 'text-[#0D9488]' : 'text-amber-700'
                }`}
              >
                {device.skinTempC.toFixed(1)} °C
              </span>
            </div>
            <input
              id="sim-temp"
              type="range"
              min="26.0"
              max="36.5"
              step="0.1"
              value={device.skinTempC}
              onChange={(e) =>
                onUpdateDevice(
                  { skinTempC: Number(e.target.value) },
                  `TMP117 updated to ${Number(e.target.value).toFixed(1)} °C`
                )
              }
              className="mt-2 h-2 w-full cursor-pointer accent-[#0D9488]"
            />
          </div>

          {/* IMU Motion Stability */}
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <label htmlFor="sim-imu" className="text-[#0F172A]">
                IMU Motion Stillness (Pass &lt; 0.050 g)
              </label>
              <span
                className={`font-mono tabular-nums ${
                  device.imuMotionG < 0.05 ? 'text-[#0D9488]' : 'text-rose-700'
                }`}
              >
                {device.imuMotionG.toFixed(3)} g
              </span>
            </div>
            <input
              id="sim-imu"
              type="range"
              min="0.002"
              max="0.250"
              step="0.002"
              value={device.imuMotionG}
              onChange={(e) =>
                onUpdateDevice(
                  { imuMotionG: Number(e.target.value) },
                  `IMU RMS updated to ${Number(e.target.value).toFixed(3)} g`
                )
              }
              className="mt-2 h-2 w-full cursor-pointer accent-[#0D9488]"
            />
          </div>

          {/* Battery Level + Charging Interlock */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label htmlFor="sim-battery" className="text-[#0F172A]">
                  LiPo Battery
                </label>
                <span className="font-mono tabular-nums text-[#0F172A]">
                  {device.batteryPct}%
                </span>
              </div>
              <input
                id="sim-battery"
                type="range"
                min="10"
                max="100"
                step="1"
                value={device.batteryPct}
                onChange={(e) =>
                  onUpdateDevice({ batteryPct: Number(e.target.value) })
                }
                className="mt-2 h-2 w-full cursor-pointer accent-[#0F172A]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                  <BatteryCharging className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span>Charging Interlock</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  USB-C / Qi Active Lockout
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={device.chargingInterlock}
                aria-label="Toggle Charging Safety Interlock"
                onClick={() =>
                  onUpdateDevice(
                    { chargingInterlock: !device.chargingInterlock },
                    !device.chargingInterlock
                      ? 'Charging Interlock ENGAGED: LT8365 HV stimulator hardware locked'
                      : 'Charging Interlock CLEARED: Patch isolated from charger'
                  )
                }
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  device.chargingInterlock ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    device.chargingInterlock ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Right: Pre-Check Sync Status & Live BLE Packet Telemetry Log (6 cols) */}
        <section className="flex flex-col gap-5 lg:col-span-6">
          {/* Live Pre-Check Summary */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A]">
                Assessment Safety Gate Readiness
              </h2>
              <span
                className={`font-mono text-xs font-bold ${
                  preCheckSummary.allPassed ? 'text-[#0D9488]' : 'text-rose-700'
                }`}
              >
                {preCheckSummary.allPassed ? 'ALL GATES PASSED' : 'GATE BLOCKED'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
              {preCheckSummary.checks.map((chk) => (
                <div
                  key={chk.key}
                  className={`rounded-lg border p-3 ${
                    chk.passed
                      ? 'border-[#E2E8F0] bg-[#F8FAFC]'
                      : 'border-rose-200 bg-rose-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#0F172A] truncate">
                      {chk.label}
                    </span>
                    {!chk.passed && (
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-700" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between font-mono tabular-nums">
                    <span
                      className={
                        chk.passed
                          ? 'font-semibold text-[#0D9488]'
                          : 'font-bold text-rose-700'
                      }
                    >
                      {chk.valueDisplay}
                    </span>
                    <span className="text-[11px] text-slate-500">{chk.requirement}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live BLE Packet Telemetry Log */}
          <div className="flex flex-1 flex-col rounded-xl border border-[#E2E8F0] bg-[#0B1120] p-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#2DD4BF]" aria-hidden="true" />
                <h2 className="font-mono text-xs font-semibold text-white">
                  Live BLE Packet Telemetry Log
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStreamPaused((p) => !p)}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  {streamPaused ? (
                    <>
                      <Play className="h-3 w-3" aria-hidden="true" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3" aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClearLog}
                  aria-label="Clear telemetry log"
                  className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="mt-3 max-h-64 flex-1 space-y-2 overflow-y-auto font-mono text-[11px]">
              {(streamPaused ? telemetryLog.slice(0, 8) : telemetryLog).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded border border-slate-800/80 bg-slate-900/70 px-3 py-2"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span>
                      [{entry.timestamp}] <span className="text-[#2DD4BF]">{entry.direction}</span>
                    </span>
                    <span className="text-slate-500">{entry.packetHex}</span>
                  </div>
                  <div className="mt-1 break-all text-slate-200">{entry.decoded}</div>
                </div>
              ))}
              {telemetryLog.length === 0 && (
                <div className="py-6 text-center text-slate-500">
                  Telemetry stream cleared. Adjust a sensor or trigger a preset to emit BLE frames.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
