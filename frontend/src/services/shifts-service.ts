import { apiClient } from '@/lib/api-client';
import {
  Shift,
  CreateShiftDto,
  UpdateShiftDto,
  UpdateShiftStatusDto,
  ListShiftsQuery,
} from '@/types/domain';

export const shiftsService = {
  async list(query?: ListShiftsQuery): Promise<Shift[]> {
    const response = await apiClient.get<Shift[]>('/shifts', {
      params: query,
    });
    return response.data;
  },

  async getById(id: string): Promise<Shift> {
    const response = await apiClient.get<Shift>(`/shifts/${id}`);
    return response.data;
  },

  async create(dto: CreateShiftDto): Promise<Shift> {
    const response = await apiClient.post<Shift>('/shifts', dto);
    return response.data;
  },

  async update(id: string, dto: UpdateShiftDto): Promise<Shift> {
    const response = await apiClient.patch<Shift>(`/shifts/${id}`, dto);
    return response.data;
  },

  async updateStatus(id: string, dto: UpdateShiftStatusDto): Promise<Shift> {
    const response = await apiClient.patch<Shift>(`/shifts/${id}/status`, dto);
    return response.data;
  },
};
