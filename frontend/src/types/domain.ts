export type MachineStatus = 'INACTIVE' | 'IDLE' | 'RUNNING' | 'STOPPED';

export interface Machine {
  id: string;
  code: string;
  name: string;
  model: string | null;
  status: MachineStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMachineDto {
  code: string;
  name: string;
  model?: string | null;
}

export interface UpdateMachineDto {
  code?: string;
  name?: string;
  model?: string | null;
  status?: MachineStatus;
  isActive?: boolean;
}

export interface UpdateMachineStatusDto {
  status?: MachineStatus;
  isActive?: boolean;
}

export interface ListMachinesQuery {
  isActive?: boolean;
  status?: MachineStatus;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShiftDto {
  name: string;
  startTime: string;
  endTime: string;
}

export interface UpdateShiftDto {
  name?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export interface UpdateShiftStatusDto {
  isActive: boolean;
}

export interface ListShiftsQuery {
  isActive?: boolean;
}

export type ShiftAllocationStatus = 'ACTIVE' | 'CLOSED';

export interface ShiftAllocation {
  id: string;
  machineId: string;
  shiftId: string;
  operatorId: string;
  shiftDate: string;
  status: ShiftAllocationStatus;
  openedAt: string;
  closedAt: string | null;
  machine?: Machine;
  shift?: Shift;
  operator?: {
    id: string;
    name: string;
    username: string;
  };
}

export interface CreateAllocationDto {
  machineId: string;
  shiftId: string;
  shiftDate: string;
}

export type DowntimeReason =
  | 'MOLDE_DEFEITO'
  | 'AQUECIMENTO'
  | 'PRESSAO_AR'
  | 'FALTA_PREFORMA'
  | 'MANUTENCAO_PREVENTIVA'
  | 'MANUTENCAO_CORRETIVA'
  | 'OUTROS';

export type DowntimeStatus = 'OPEN' | 'RESOLVED';

export interface ProductionEntry {
  id: string;
  clientUuid: string;
  allocationId: string;
  quantity: number;
  recordedAt: string;
  createdAt: string;
}

export interface DowntimeRecord {
  id: string;
  clientUuid: string;
  allocationId: string;
  reason: DowntimeReason;
  justification: string | null;
  startTime: string;
  endTime: string | null;
  status: DowntimeStatus;
  createdAt: string;
}


