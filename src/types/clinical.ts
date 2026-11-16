export type NerveType = 'sural' | 'median';

export type WorkspaceMode = 'patient' | 'clinician' | 'device';

export type PatientSubTab = 'summary' | 'waveforms' | 'trends' | 'protocols';

export type AssessmentStatus = 'nominal' | 'watch' | 'alert';

export interface PatientProfile {
  name: string;
  mrn: string;
  age: number;
  dob: string;
  condition: string;
  prevalenceNote: string;
  supervisor: string;
  supervisorTitle: string;
  clinic: string;
}

export interface NerveBaseline {
  nerve: NerveType;
  label: string;
  anatomicalSite: string;
  electrodeDistanceCm: number;
  interRecordingMm: number;
  ncv: number; // m/s
  amplitude: number; // uV
  onsetLatency: number; // ms
  peakLatency: number; // ms
  tempC: number; // deg C
  lockedDate: string;
}

export interface AssessmentRecord {
  id: string; // e.g., TEST-008
  date: string; // ISO date YYYY-MM-DD
  weekLabel: string; // e.g., Wk 8
  nerve: NerveType;
  rawNcv: number; // uncorrected m/s
  ncv: number; // temperature-corrected m/s
  amplitude: number; // uV peak-to-peak
  onsetLatency: number; // t1 ms
  peakLatency: number; // ms
  deltaT: number; // ms between R1 and R2
  tempC: number; // TMP117 C
  tempCorrected: boolean;
  stimCurrentMa: number;
  pulseWidthMs: number;
  sweepsAveraged: number;
  sweepsRejected: number;
  impedanceKOhm: number;
  imuMotionG: number;
  notes: string;
}

export interface ThresholdConfig {
  cvReductionAlertPct: number; // default 10
  ampReductionAlertPct: number; // default 20
}

export interface DeviceState {
  bleMode: 'simulator' | 'web-bluetooth';
  connected: boolean;
  deviceName: string;
  firmwareVersion: string;
  batteryPct: number;
  impedanceKOhm: number;
  skinTempC: number;
  imuMotionG: number;
  chargingInterlock: boolean;
  stimCurrentMa: number;
  pulseWidthMs: number;
  lastError: string | null;
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  direction: 'RX' | 'TX' | 'SYS';
  packetHex: string;
  decoded: string;
}

export interface PreCheckResult {
  key: 'impedance' | 'temperature' | 'imu' | 'charging';
  label: string;
  requirement: string;
  valueDisplay: string;
  passed: boolean;
  detail: string;
}
