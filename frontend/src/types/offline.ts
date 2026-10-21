import { DowntimeReason, DowntimeStatus } from './domain';

export type OfflineEventType = 'PRODUCTION' | 'DOWNTIME';
export type OfflineEventStatus = 'PENDING' | 'SYNCED';

export interface ProductionPayload {
  allocationId: string;
  quantity: number;
  recordedAt: string;
}

export interface DowntimePayload {
  allocationId: string;
  reason: DowntimeReason;
  justification?: string | null;
  startTime: string;
  endTime?: string | null;
  status: DowntimeStatus;
}

export interface OfflineEvent<T = Record<string, unknown>> {
  clientUuid: string;
  type: OfflineEventType;
  endpoint: string;
  payload: T;
  createdAt: string;
  status: OfflineEventStatus;
}

export interface SyncBatchResponse {
  success: boolean;
  totalReceived: number;
  processedCount: number;
  ignoredCount: number;
  processedClientUuids: string[];
  ignoredClientUuids: string[];
}
