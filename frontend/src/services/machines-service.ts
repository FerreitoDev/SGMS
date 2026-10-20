import { apiClient } from '@/lib/api-client';
import {
  Machine,
  CreateMachineDto,
  UpdateMachineDto,
  UpdateMachineStatusDto,
  ListMachinesQuery,
} from '@/types/domain';

export const machinesService = {
  async list(query?: ListMachinesQuery): Promise<Machine[]> {
    const response = await apiClient.get<Machine[]>('/machines', {
      params: query,
    });
    return response.data;
  },

  async getById(id: string): Promise<Machine> {
    const response = await apiClient.get<Machine>(`/machines/${id}`);
    return response.data;
  },

  async create(dto: CreateMachineDto): Promise<Machine> {
    const response = await apiClient.post<Machine>('/machines', dto);
    return response.data;
  },

  async update(id: string, dto: UpdateMachineDto): Promise<Machine> {
    const response = await apiClient.patch<Machine>(`/machines/${id}`, dto);
    return response.data;
  },

  async updateStatus(id: string, dto: UpdateMachineStatusDto): Promise<Machine> {
    const response = await apiClient.patch<Machine>(`/machines/${id}/status`, dto);
    return response.data;
  },
};
