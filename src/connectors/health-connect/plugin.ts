import { registerPlugin } from '@capacitor/core';

export type HealthConnectRecordType =
  | 'HeartRateVariabilityRmssd'
  | 'RestingHeartRate'
  | 'SleepSession'
  | 'Steps'
  | 'Weight';

export interface NativeHealthRecord {
  recordType: HealthConnectRecordType;
  id: string;
  startTime: string;
  endTime?: string;
  zoneOffset?: string;
  lastModifiedTime?: string;
  data: Record<string, unknown>;
}

export interface HealthConnectPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestPermissions(options:{recordTypes:HealthConnectRecordType[]}):Promise<{granted:HealthConnectRecordType[]}>;
  readRecords(options:{recordTypes:HealthConnectRecordType[];startTime:string;endTime:string}):Promise<{records:NativeHealthRecord[]}>;
}

export const HealthConnectNative=registerPlugin<HealthConnectPlugin>('HealthConnect');
