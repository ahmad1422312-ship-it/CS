import { useMemo, useState } from 'react';
import { Activity, FileBarChart2, ShieldCheck, Waves } from 'lucide-react';
import { TopNav } from './components/TopNav';
import { SummaryTab } from './components/SummaryTab';
import { WaveformsTab } from './components/WaveformsTab';
import { TrendsTab } from './components/TrendsTab';
import { ProtocolsTab } from './components/ProtocolsTab';
import { ClinicianView } from './components/ClinicianView';
import { DeviceBridgeView } from './components/DeviceBridgeView';
import { GuidedAssessmentModal } from './components/GuidedAssessmentModal';
import { NcsReportModal } from './components/NcsReportModal';
import {
  INITIAL_BASELINES,
  INITIAL_DEVICE_STATE,
  INITIAL_RECORDS,
  INITIAL_TELEMETRY_LOG,
  INITIAL_THRESHOLDS,
  PATIENT_PROFILE,
} from './data/seedData';
import type {
  AssessmentRecord,
  DeviceState,
  NerveBaseline,
  NerveType,
  PatientSubTab,
  TelemetryLogEntry,
  ThresholdConfig,
  WorkspaceMode,
} from './types/clinical';

const SUB_TABS: { id: PatientSubTab; label: string; icon: typeof Activity }[] = [
  { id: 'summary', label: 'Summary', icon: Activity },
  { id: 'waveforms', label: 'Waveforms', icon: Waves },
  { id: 'trends', label: 'Trends', icon: FileBarChart2 },
  { id: 'protocols', label: 'Protocols', icon: ShieldCheck },
];

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceMode>('patient');
  const [subTab, setSubTab] = useState<PatientSubTab>('summary');
  const [activeNerve, setActiveNerve] = useState<NerveType>('sural');

  const [baselines, setBaselines] = useState<Record<NerveType, NerveBaseline>>(
    INITIAL_BASELINES
  );
  const [records, setRecords] = useState<AssessmentRecord[]>(INITIAL_RECORDS);
  const [thresholds, setThresholds] = useState<ThresholdConfig>(INITIAL_THRESHOLDS);
  const [device, setDevice] = useState<DeviceState>(INITIAL_DEVICE_STATE);
  const [telemetryLog, setTelemetryLog] = useState<TelemetryLogEntry[]>(
    INITIAL_TELEMETRY_LOG
  );

  const [reportRecord, setReportRecord] = useState<AssessmentRecord | null>(null);
  const [assessmentOpen, setAssessmentOpen] = useState<boolean>(false);

  const nerveRecords = useMemo(
    () => records.filter((r) => r.nerve === activeNerve),
    [records, activeNerve]
  );

  const activeBaseline = baselines[activeNerve];

  const appendTelemetry = (
    entry: Omit<TelemetryLogEntry, 'id' | 'timestamp'>
  ) => {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(
      now.getMilliseconds()
    ).padStart(3, '0')}`;
    setTelemetryLog((prev) => [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: ts,
        ...entry,
      },
      ...prev.slice(0, 49),
    ]);
  };

  const handleUpdateDevice = (patch: Partial<DeviceState>, logNote?: string) => {
    setDevice((prev) => {
      const next = { ...prev, ...patch };
      if (logNote) {
        appendTelemetry({
          direction: 'RX',
          packetHex: `0x4E 0x54 ${Math.round(next.impedanceKOhm * 10)
            .toString(16)
            .toUpperCase()
            .padStart(2, '0')} ${Math.round(next.skinTempC)
            .toString(16)
            .toUpperCase()
            .padStart(2, '0')} ${next.chargingInterlock ? '0x01' : '0x00'}`,
          decoded: logNote,
        });
      }
      return next;
    });
  };

  const handleLockBaselineFromLatest = () => {
    const latest = nerveRecords[0];
    if (!latest) return;
    setBaselines((prev) => ({
      ...prev,
      [activeNerve]: {
        ...prev[activeNerve],
        ncv: latest.ncv,
        amplitude: latest.amplitude,
        onsetLatency: latest.onsetLatency,
        peakLatency: latest.peakLatency,
        tempC: latest.tempC,
        lockedDate: latest.date,
      },
    }));
  };

  const handleSaveAssessmentRecord = (newRecord: AssessmentRecord) => {
    setRecords((prev) => [newRecord, ...prev]);
    appendTelemetry({
      direction: 'SYS',
      packetHex: '0xAA 0x55 0x10 0x01',
      decoded: `Committed ${newRecord.id} (${newRecord.nerve.toUpperCase()}): NCV=${newRecord.ncv} m/s, SNAP=${newRecord.amplitude} uV`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <TopNav
        patient={PATIENT_PROFILE}
        workspace={workspace}
        onSelectWorkspace={setWorkspace}
        device={device}
        onStartAssessment={() => setAssessmentOpen(true)}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {workspace === 'patient' && (
          <div className="space-y-6">
            {/* Horizontal Sub-Navigation Bar for Patient Portal */}
            <div className="no-print flex items-center justify-between border-b border-[#E2E8F0]">
              <nav
                aria-label="Patient Portal Views"
                className="-mb-px flex gap-2 overflow-x-auto sm:gap-6"
              >
                {SUB_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = subTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSubTab(tab.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex items-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'border-[#0D9488] text-[#0F172A]'
                          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-[#0F172A]'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? 'text-[#0D9488]' : 'text-slate-400'}`}
                        aria-hidden="true"
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {subTab === 'summary' && (
              <SummaryTab
                patient={PATIENT_PROFILE}
                activeNerve={activeNerve}
                onSelectNerve={setActiveNerve}
                baseline={activeBaseline}
                records={nerveRecords}
                thresholds={thresholds}
                onOpenReport={setReportRecord}
                onStartAssessment={() => setAssessmentOpen(true)}
              />
            )}

            {subTab === 'waveforms' && (
              <WaveformsTab records={nerveRecords} baseline={activeBaseline} />
            )}

            {subTab === 'trends' && (
              <TrendsTab
                records={nerveRecords}
                baseline={activeBaseline}
                thresholds={thresholds}
              />
            )}

            {subTab === 'protocols' && <ProtocolsTab patient={PATIENT_PROFILE} />}
          </div>
        )}

        {workspace === 'clinician' && (
          <ClinicianView
            patient={PATIENT_PROFILE}
            activeNerve={activeNerve}
            onSelectNerve={setActiveNerve}
            baseline={activeBaseline}
            records={nerveRecords}
            thresholds={thresholds}
            onUpdateThresholds={setThresholds}
            onLockBaselineFromLatest={handleLockBaselineFromLatest}
            onOpenReport={setReportRecord}
          />
        )}

        {workspace === 'device' && (
          <DeviceBridgeView
            device={device}
            onUpdateDevice={handleUpdateDevice}
            telemetryLog={telemetryLog}
            onAppendLog={appendTelemetry}
            onClearLog={() => setTelemetryLog([])}
            onStartAssessment={() => setAssessmentOpen(true)}
          />
        )}
      </main>

      <GuidedAssessmentModal
        isOpen={assessmentOpen}
        onClose={() => setAssessmentOpen(false)}
        activeNerve={activeNerve}
        onSelectNerve={setActiveNerve}
        baselines={baselines}
        device={device}
        onOpenDeviceBridge={() => setWorkspace('device')}
        onSaveRecord={handleSaveAssessmentRecord}
        nextTestNumber={nerveRecords.length + 1}
      />

      <NcsReportModal
        record={reportRecord}
        patient={PATIENT_PROFILE}
        baseline={reportRecord ? baselines[reportRecord.nerve] : activeBaseline}
        thresholds={thresholds}
        onClose={() => setReportRecord(null)}
      />
    </div>
  );
}
