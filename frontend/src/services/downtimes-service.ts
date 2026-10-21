import { apiClient } from '@/lib/api-client';
import type { DowntimeRecord, DowntimeReason } from '@/types/domain';

export interface StartDowntimePayload {
  clientUuid: string;
  allocationId: string;
  reason: DowntimeReason;
  justification?: string | null;
  startTime: string;
}

export interface ResolveDowntimePayload {
  endTime?: string;
}

export interface RetroactiveDowntimePayload {
  clientUuid: string;
  allocationId: string;
  reason: DowntimeReason;
  justification?: string | null;
  startTime: string;
  endTime: string;
}

export const downtimesService = {
  async listByAllocation(allocationId: string): Promise<DowntimeRecord[]> {
    const response = await apiClient.get<DowntimeRecord[]>(`/downtimes/allocation/${allocationId}`);
    return response.data;
  },

  async start(dto: StartDowntimePayload): Promise<DowntimeRecord> {
    const response = await apiClient.post<DowntimeRecord>('/downtimes/start', dto);
    return response.data;
  },

  async resolve(id: string, dto?: ResolveDowntimePayload): Promise<DowntimeRecord> {
    const response = await apiClient.patch<DowntimeRecord>(`/downtimes/${id}/resolve`, dto ?? {});
    return response.data;
  },

  async createRetroactive(dto: RetroactiveDowntimePayload): Promise<DowntimeRecord> {
    const response = await apiClient.post<DowntimeRecord>('/downtimes/retroactive', dto);
    return response.data;
  },
};
