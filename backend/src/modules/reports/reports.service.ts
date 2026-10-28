import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DowntimeReason, DowntimeStatus, Prisma } from '@prisma/client';
import {
  DashboardMetrics,
  ParetoItem,
  ReportFilterDto,
  AllocationReportRow,
} from './interfaces/dashboard-metrics.interface';
import { DOWNTIME_REASON_LABELS } from './constants/downtime-labels.constant';
import {
  calculateShiftDurationMinutes,
  parseDateRange,
} from './utils/shift-time.util';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida a integridade do intervalo de datas informado.
   */
  private validateDateInterval(startDate: Date, endDate: Date): void {
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException({
        title: 'Requisição Inválida',
        message: 'Formato de data inválido.',
        code: 'INVALID_DATE_FORMAT',
      });
    }

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException({
        title: 'Requisição Inválida',
        message: 'A data final deve ser maior ou igual à data inicial.',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  /**
   * Consolida os indicadores gerais e o ranking Pareto para o dashboard gerencial (RF-10, RN-02).
   */
  async getDashboardMetrics(filters: ReportFilterDto): Promise<DashboardMetrics> {
    const { startDate, endDate } = parseDateRange(filters.startDate, filters.endDate);
    this.validateDateInterval(startDate, endDate);

    const whereAllocation: Prisma.ShiftAllocationWhereInput = {
      shiftDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filters.machineId) {
      whereAllocation.machineId = filters.machineId;
    }

    if (filters.shiftId) {
      whereAllocation.shiftId = filters.shiftId;
    }

    const allocations = await this.prisma.shiftAllocation.findMany({
      where: whereAllocation,
      include: {
        shift: true,
        productions: {
          select: {
            quantity: true,
          },
        },
        downtimes: {
          where: {
            status: DowntimeStatus.RESOLVED,
          },
          select: {
            reason: true,
            durationMinutes: true,
          },
        },
      },
    });

    // 1. Volume Total de Garrafas (V_prod = sum(Q_i))
    let totalBottles = 0;
    for (const alloc of allocations) {
      for (const prod of alloc.productions) {
        totalBottles += prod.quantity;
      }
    }

    // 2. Tempo Total Parado (T_parada) e Pausas Planejadas (RN-10)
    let unplannedDowntimeMinutes = 0;
    let plannedBreakMinutes = 0;
    const reasonAggregation = new Map<
      DowntimeReason,
      { occurrences: number; totalMinutes: number }
    >();

    for (const alloc of allocations) {
      for (const dt of alloc.downtimes) {
        const duration = dt.durationMinutes ?? 0;
        if (dt.reason === DowntimeReason.REFEICAO_INTERVALO) {
          plannedBreakMinutes += duration;
        } else {
          unplannedDowntimeMinutes += duration;

          const current = reasonAggregation.get(dt.reason) ?? {
            occurrences: 0,
            totalMinutes: 0,
          };
          current.occurrences += 1;
          current.totalMinutes += duration;
          reasonAggregation.set(dt.reason, current);
        }
      }
    }

    // 3. Tempo Planejado do Turno no Período (T_planejado) e Dedução de Pausas Planejadas (RN-10)
    // Agrupa por máquina + turno + data para não inflar tempo em caso de múltiplas alocações no mesmo slot
    const plannedSlots = new Set<string>();
    let rawPlannedMinutes = 0;

    for (const alloc of allocations) {
      const slotKey = `${alloc.machineId}_${alloc.shiftId}_${alloc.shiftDate.toISOString().slice(0, 10)}`;
      if (!plannedSlots.has(slotKey)) {
        plannedSlots.add(slotKey);
        rawPlannedMinutes += calculateShiftDurationMinutes(
          alloc.shift.startTime,
          alloc.shift.endTime,
        );
      }
    }

    const totalPlannedMinutes = Math.max(0, rawPlannedMinutes - plannedBreakMinutes);
    const totalDowntimeMinutes = unplannedDowntimeMinutes;

    // 4. Tempo Operacional Líquido e Taxa de Disponibilidade (RN-02 e RN-10)
    // T_liquido = max(0, T_planejado_disponivel - T_parada_falha)
    const netOperatingMinutes = Math.max(0, totalPlannedMinutes - totalDowntimeMinutes);

    // Se T_parada > T_planejado, D assume estritamente 0% (proibido negativo)
    const rawAvailability =
      totalPlannedMinutes > 0
        ? (netOperatingMinutes / totalPlannedMinutes) * 100
        : 0;
    const availabilityPercentage = Math.round(rawAvailability * 10) / 10;

    // 5. Ritmo Médio de Produção (R em garrafas/hora)
    // R = V_prod / (T_liquido / 60) se T_liquido > 0; senão 0
    const rawPace =
      netOperatingMinutes > 0
        ? totalBottles / (netOperatingMinutes / 60)
        : 0;
    const averagePaceBottlesPerHour = Math.round(rawPace * 10) / 10;

    // 6. Ranking de Pareto (estritamente paradas não planejadas, ordenado decrescentemente por totalMinutes)
    const sortedReasons = Array.from(reasonAggregation.entries()).sort(
      (a, b) => b[1].totalMinutes - a[1].totalMinutes,
    );

    let cumulativeSum = 0;
    const pareto: ParetoItem[] = sortedReasons.map(([reason, data], index) => {
      const percentage =
        totalDowntimeMinutes > 0
          ? (data.totalMinutes / totalDowntimeMinutes) * 100
          : 0;
      cumulativeSum += percentage;

      const roundedPercentage = Math.round(percentage * 10) / 10;
      const isLast = index === sortedReasons.length - 1;
      const cumulativePercentage =
        isLast && totalDowntimeMinutes > 0
          ? 100
          : Math.min(100, Math.round(cumulativeSum * 10) / 10);

      return {
        reason,
        reasonLabel: DOWNTIME_REASON_LABELS[reason],
        occurrences: data.occurrences,
        totalMinutes: data.totalMinutes,
        percentage: roundedPercentage,
        cumulativePercentage,
      };
    });

    return {
      totalBottles,
      totalDowntimeMinutes,
      totalPlannedMinutes,
      availabilityPercentage,
      averagePaceBottlesPerHour,
      pareto,
    };
  }

  /**
   * Recupera dados analíticos detalhados por alocação para alimentar geradores de relatório (CSV/PDF).
   */
  async getDetailedAllocationRows(filters: ReportFilterDto): Promise<AllocationReportRow[]> {
    const { startDate, endDate } = parseDateRange(filters.startDate, filters.endDate);
    this.validateDateInterval(startDate, endDate);

    const whereAllocation: Prisma.ShiftAllocationWhereInput = {
      shiftDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filters.machineId) {
      whereAllocation.machineId = filters.machineId;
    }

    if (filters.shiftId) {
      whereAllocation.shiftId = filters.shiftId;
    }

    const allocations = await this.prisma.shiftAllocation.findMany({
      where: whereAllocation,
      include: {
        machine: true,
        shift: true,
        operator: true,
        productions: true,
        downtimes: {
          where: {
            status: DowntimeStatus.RESOLVED,
          },
        },
      },
      orderBy: [
        { shiftDate: 'asc' },
        { machine: { code: 'asc' } },
      ],
    });

    return allocations.map((alloc) => {
      const goodBottles = alloc.productions.reduce((acc, p) => acc + p.quantity, 0);

      let downtimeMinutes = 0;
      let plannedBreakMinutes = 0;
      const reasonCountMap = new Map<DowntimeReason, number>();

      for (const dt of alloc.downtimes) {
        const dur = dt.durationMinutes ?? 0;
        if (dt.reason === DowntimeReason.REFEICAO_INTERVALO) {
          plannedBreakMinutes += dur;
        } else {
          downtimeMinutes += dur;
          reasonCountMap.set(dt.reason, (reasonCountMap.get(dt.reason) ?? 0) + dur);
        }
      }

      const rawPlannedMinutes = calculateShiftDurationMinutes(
        alloc.shift.startTime,
        alloc.shift.endTime,
      );
      const plannedMinutes = Math.max(0, rawPlannedMinutes - plannedBreakMinutes);

      const netMinutes = Math.max(0, plannedMinutes - downtimeMinutes);
      const rawAvail = plannedMinutes > 0 ? (netMinutes / plannedMinutes) * 100 : 0;
      const availabilityPercentage = Math.round(rawAvail * 10) / 10;

      const rawPace = netMinutes > 0 ? goodBottles / (netMinutes / 60) : 0;
      const paceBottlesPerHour = Math.round(rawPace * 10) / 10;

      // Principal gargalo da alocação (motivo de falha com maior tempo parado, excluindo REFEICAO_INTERVALO)
      let mainBottleneck: string | null = null;
      let maxDuration = 0;

      for (const [reason, dur] of reasonCountMap.entries()) {
        if (dur > maxDuration) {
          maxDuration = dur;
          mainBottleneck = DOWNTIME_REASON_LABELS[reason];
        }
      }

      return {
        allocationId: alloc.id,
        date: alloc.shiftDate.toISOString().slice(0, 10),
        shiftName: alloc.shift.name,
        machineCode: alloc.machine.code,
        machineName: alloc.machine.name,
        operatorName: alloc.operator.name,
        goodBottles,
        downtimeMinutes,
        plannedMinutes,
        availabilityPercentage,
        paceBottlesPerHour,
        mainBottleneck,
      };
    });
  }
}
