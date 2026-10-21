import { apiClient } from '@/lib/api-client';
import type { OfflinePayload, SyncBatchResponse } from '@/types/offline';

export interface SyncEventItemPayload {
  clientUuid: string;
  type: 'PRODUCTION' | 'DOWNTIME';
  payload: OfflinePayload;
}

export interface SyncBatchRequest {
  events: SyncEventItemPayload[];
}

export const syncService = {
  /**
   * Envia lote de eventos acumulados no IndexedDB para processamento idempotente no backend
   */
  async processBatch(events: SyncEventItemPayload[]): Promise<SyncBatchResponse> {
    const response = await apiClient.post<SyncBatchResponse>('/sync', { events });
    return response.data;
  },
};
