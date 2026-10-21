import { DowntimeReason, DowntimeStatus } from './domain';

export type OfflineEventType = 'PRODUCTION' | 'DOWNTIME';
export type OfflineEventStatus = 'PENDING' | 'SYNCED';

export interface ProductionPayload {
  allocationId: string;
  quantity: number;
  timestamp: string;
}

export interface DowntimePayload {
  allocationId: string;
  reason: DowntimeReason;
  justification?: string | null;
  startTime: string;
  endTime?: string | null;
  status: DowntimeStatus;
}

export interface ResolveDowntimePayload {
  allocationId: string;
  endTime: string;
}

export type OfflinePayload = ProductionPayload | DowntimePayload | ResolveDowntimePayload;

export interface OfflineEvent<T = OfflinePayload> {
  clientUuid: string;
  type: OfflineEventType;
  endpoint: string;
  payload: T;
  createdAt: string;
  status: OfflineEventStatus;
}

export interface ProductionOfflineEvent extends OfflineEvent<ProductionPayload> {
  type: 'PRODUCTION';
}

export interface DowntimeOfflineEvent extends OfflineEvent<DowntimePayload> {
  type: 'DOWNTIME';
}

export interface SyncBatchResponse {
  success: boolean;
  totalReceived: number;
  processedCount: number;
  ignoredCount: number;
  processedClientUuids: string[];
  ignoredClientUuids: string[];
}
