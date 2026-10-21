import { DowntimeReason } from '@prisma/client';

export interface ParetoItem {
  reason: DowntimeReason;
  reasonLabel: string;
  occurrences: number;
  totalMinutes: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface DashboardMetrics {
  totalBottles: number;
  totalDowntimeMinutes: number;
  totalPlannedMinutes: number;
  availabilityPercentage: number;
  averagePaceBottlesPerHour: number;
  pareto: ParetoItem[];
}

export interface ReportFilterDto {
  startDate: string;
  endDate: string;
  machineId?: string;
  shiftId?: string;
}

export interface AllocationReportRow {
  allocationId: string;
  date: string;
  shiftName: string;
  machineCode: string;
  machineName: string;
  operatorName: string;
  goodBottles: number;
  downtimeMinutes: number;
  plannedMinutes: number;
  availabilityPercentage: number;
  paceBottlesPerHour: number;
  mainBottleneck: string | null;
}
