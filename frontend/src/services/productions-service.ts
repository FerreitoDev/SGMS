import { apiClient } from '@/lib/api-client';
import type { AllocationProductionsResponse, ProductionEntry } from '@/types/domain';

export interface CreateProductionPayload {
  clientUuid: string;
  allocationId: string;
  quantity: number;
  timestamp: string;
}

export const productionsService = {
  async listByAllocation(allocationId: string): Promise<AllocationProductionsResponse> {
    const response = await apiClient.get<AllocationProductionsResponse>(`/productions/allocation/${allocationId}`);
    return response.data;
  },

  async create(dto: CreateProductionPayload): Promise<ProductionEntry> {
    const response = await apiClient.post<ProductionEntry>('/productions', dto);
    return response.data;
  },
};
