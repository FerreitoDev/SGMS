import { apiClient } from '@/lib/api-client';
import {
  ShiftAllocation,
  CreateAllocationDto,
} from '@/types/domain';

export const allocationsService = {
  async getCurrent(): Promise<ShiftAllocation | null> {
    const response = await apiClient.get<ShiftAllocation | null>('/allocations/current');
    return response.data ?? null;
  },

  async create(dto: CreateAllocationDto): Promise<ShiftAllocation> {
    const response = await apiClient.post<ShiftAllocation>('/allocations', dto);
    return response.data;
  },

  async release(id: string): Promise<ShiftAllocation> {
    const response = await apiClient.patch<ShiftAllocation>(`/allocations/${id}/release`);
    return response.data;
  },

  async close(id: string): Promise<ShiftAllocation> {
    const response = await apiClient.post<ShiftAllocation>(`/allocations/${id}/close`);
    return response.data;
  },
};
