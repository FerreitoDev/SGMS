import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { DowntimeReason, DowntimeStatus } from '@prisma/client';
import { calculateShiftDurationMinutes } from './utils/shift-time.util';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    shiftAllocation: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      shiftAllocation: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('calculateShiftDurationMinutes', () => {
    it('deve calcular corretamente duração de turno no mesmo dia', () => {
      expect(calculateShiftDurationMinutes('06:00', '14:00')).toBe(480);
      expect(calculateShiftDurationMinutes('08:00', '17:00')).toBe(540);
    });

    it('deve calcular corretamente duração de turno noturno que vira a noite', () => {
      expect(calculateShiftDurationMinutes('22:00', '06:00')).toBe(480);
      expect(calculateShiftDurationMinutes('23:00', '07:00')).toBe(480);
    });
  });

  describe('getDashboardMetrics', () => {
    it('deve rejeitar intervalo com endDate menor que startDate com BadRequestException', async () => {
      await expect(
        service.getDashboardMetrics({
          startDate: '2026-10-25',
          endDate: '2026-10-20',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar datas malformadas com BadRequestException', async () => {
      await expect(
        service.getDashboardMetrics({
          startDate: 'not-a-date',
          endDate: '2026-10-25',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve calcular métricas consolidadas e ranking Pareto com exatidão matemática', async () => {
      const mockAllocations = [
        {
          id: 'alloc-1',
          machineId: 'mach-1',
          shiftId: 'shift-1',
          shiftDate: new Date('2026-10-21T00:00:00.000Z'),
          shift: {
            id: 'shift-1',
            startTime: '06:00',
            endTime: '14:00', // 480 min
          },
          productions: [
            { quantity: 5000 },
            { quantity: 7000 },
          ], // Total: 12000 garrafas
          downtimes: [
            { reason: DowntimeReason.MOLDE, durationMinutes: 40 },
            { reason: DowntimeReason.COMPRESSOR, durationMinutes: 20 },
          ], // Total: 60 min
        },
      ];

      prisma.shiftAllocation.findMany.mockResolvedValue(mockAllocations);

      const result = await service.getDashboardMetrics({
        startDate: '2026-10-21',
        endDate: '2026-10-21',
      });

      // V_prod = 12000
      expect(result.totalBottles).toBe(12000);
      // T_parada = 60
      expect(result.totalDowntimeMinutes).toBe(60);
      // T_planejado = 480
      expect(result.totalPlannedMinutes).toBe(480);
      // T_liquido = 480 - 60 = 420 min (7 horas)
      // D = (420 / 480) * 100 = 87.5%
      expect(result.availabilityPercentage).toBe(87.5);
      // R = 12000 / 7 = 1714.3 garrafas/hora
      expect(result.averagePaceBottlesPerHour).toBe(1714.3);

      // Pareto:
      // MOLDE: 40min / 60min = 66.7%
      // COMPRESSOR: 20min / 60min = 33.3%
      expect(result.pareto).toHaveLength(2);
      expect(result.pareto[0]).toEqual({
        reason: DowntimeReason.MOLDE,
        reasonLabel: 'Molde',
        occurrences: 1,
        totalMinutes: 40,
        percentage: 66.7,
        cumulativePercentage: 66.7,
      });
      expect(result.pareto[1]).toEqual({
        reason: DowntimeReason.COMPRESSOR,
        reasonLabel: 'Compressor',
        occurrences: 1,
        totalMinutes: 20,
        percentage: 33.3,
        cumulativePercentage: 100,
      });
    });

    it('deve retornar números reais 0 para período sem alocações nem produção (Zero Fallback)', async () => {
      prisma.shiftAllocation.findMany.mockResolvedValue([]);

      const result = await service.getDashboardMetrics({
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      });

      expect(result.totalBottles).toBe(0);
      expect(result.totalDowntimeMinutes).toBe(0);
      expect(result.totalPlannedMinutes).toBe(0);
      expect(result.availabilityPercentage).toBe(0);
      expect(result.averagePaceBottlesPerHour).toBe(0);
      expect(result.pareto).toEqual([]);
    });

    it('deve retornar 100% de disponibilidade e Pareto vazio quando não houver paradas no período', async () => {
      const mockAllocations = [
        {
          id: 'alloc-1',
          machineId: 'mach-1',
          shiftId: 'shift-1',
          shiftDate: new Date('2026-10-21T00:00:00.000Z'),
          shift: {
            id: 'shift-1',
            startTime: '06:00',
            endTime: '14:00', // 480 min
          },
          productions: [{ quantity: 15000 }],
          downtimes: [],
        },
      ];

      prisma.shiftAllocation.findMany.mockResolvedValue(mockAllocations);

      const result = await service.getDashboardMetrics({
        startDate: '2026-10-21',
        endDate: '2026-10-21',
      });

      expect(result.totalBottles).toBe(15000);
      expect(result.totalDowntimeMinutes).toBe(0);
      expect(result.totalPlannedMinutes).toBe(480);
      expect(result.availabilityPercentage).toBe(100);
      expect(result.averagePaceBottlesPerHour).toBe(1875);
      expect(result.pareto).toEqual([]);
    });

    it('deve limitar disponibilidade a 0% se o tempo de paradas exceder o tempo planejado (RN-02)', async () => {
      const mockAllocations = [
        {
          id: 'alloc-1',
          machineId: 'mach-1',
          shiftId: 'shift-1',
          shiftDate: new Date('2026-10-21T00:00:00.000Z'),
          shift: {
            id: 'shift-1',
            startTime: '06:00',
            endTime: '14:00', // 480 min
          },
          productions: [],
          downtimes: [
            { reason: DowntimeReason.ELETRICA, durationMinutes: 500 }, // > 480
          ],
        },
      ];

      prisma.shiftAllocation.findMany.mockResolvedValue(mockAllocations);

      const result = await service.getDashboardMetrics({
        startDate: '2026-10-21',
        endDate: '2026-10-21',
      });

      expect(result.totalDowntimeMinutes).toBe(500);
      expect(result.totalPlannedMinutes).toBe(480);
      expect(result.availabilityPercentage).toBe(0); // Não negativo!
      expect(result.averagePaceBottlesPerHour).toBe(0);
    });
  });

  describe('getDetailedAllocationRows', () => {
    it('deve consolidar linhas de relatório por alocação e identificar o principal gargalo', async () => {
      const mockAllocations = [
        {
          id: 'alloc-1',
          machineId: 'm-1',
          shiftId: 's-1',
          operatorId: 'op-1',
          shiftDate: new Date('2026-10-21T00:00:00.000Z'),
          machine: { code: 'SOP-01', name: 'Sopradora 01' },
          shift: { name: 'Manhã', startTime: '06:00', endTime: '14:00' },
          operator: { name: 'Operador Teste' },
          productions: [{ quantity: 8000 }],
          downtimes: [
            { reason: DowntimeReason.PRE_FORMA, durationMinutes: 15 },
            { reason: DowntimeReason.MECANICA, durationMinutes: 45 },
          ],
        },
        {
          id: 'alloc-2',
          machineId: 'm-2',
          shiftId: 's-1',
          operatorId: 'op-2',
          shiftDate: new Date('2026-10-21T00:00:00.000Z'),
          machine: { code: 'SOP-02', name: 'Sopradora 02' },
          shift: { name: 'Manhã', startTime: '06:00', endTime: '14:00' },
          operator: { name: 'Outro Operador' },
          productions: [{ quantity: 10000 }],
          downtimes: [],
        },
      ];

      prisma.shiftAllocation.findMany.mockResolvedValue(mockAllocations);

      const rows = await service.getDetailedAllocationRows({
        startDate: '2026-10-21',
        endDate: '2026-10-21',
      });

      expect(rows).toHaveLength(2);

      // Linha 1: com paradas, gargalo Mecânica (45 min > 15 min)
      expect(rows[0]).toEqual({
        allocationId: 'alloc-1',
        date: '2026-10-21',
        shiftName: 'Manhã',
        machineCode: 'SOP-01',
        machineName: 'Sopradora 01',
        operatorName: 'Operador Teste',
        goodBottles: 8000,
        downtimeMinutes: 60,
        plannedMinutes: 480,
        availabilityPercentage: 87.5,
        paceBottlesPerHour: 1142.9,
        mainBottleneck: 'Mecânica',
      });

      // Linha 2: sem paradas, gargalo deve ser null (Zero Fallback)
      expect(rows[1]).toEqual({
        allocationId: 'alloc-2',
        date: '2026-10-21',
        shiftName: 'Manhã',
        machineCode: 'SOP-02',
        machineName: 'Sopradora 02',
        operatorName: 'Outro Operador',
        goodBottles: 10000,
        downtimeMinutes: 0,
        plannedMinutes: 480,
        availabilityPercentage: 100,
        paceBottlesPerHour: 1250,
        mainBottleneck: null,
      });
    });
  });
});
