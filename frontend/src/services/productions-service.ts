import { apiClient } from '@/lib/api-client';
import type { ProductionEntry } from '@/types/domain';

export interface CreateProductionPayload {
  clientUuid: string;
  allocationId: string;
  quantity: number;
  recordedAt: string;
}

export const productionsService = {
  async listByAllocation(allocationId: string): Promise<ProductionEntry[]> {
    const response = await apiClient.get<ProductionEntry[]>(`/productions/allocation/${allocationId}`);
    return response.data;
  },

  async create(dto: CreateProductionPayload): Promise<ProductionEntry> {
    const response = await apiClient.post<ProductionEntry>('/productions', dto);
    return response.data;
  },
};
