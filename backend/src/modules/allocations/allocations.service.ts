import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import {
  MachineStatus,
  ShiftAllocationStatus,
  Prisma,
  UserRole,
  DowntimeStatus,
} from '@prisma/client';

@Injectable()
export class AllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAllocationDto, operatorId: string) {
    const dateOnly = dto.shiftDate.split('T')[0];
    const shiftDate = new Date(`${dateOnly}T00:00:00.000Z`);

    if (isNaN(shiftDate.getTime())) {
      throw new BadRequestException({
        message: 'Data do turno deve ser uma data válida no formato YYYY-MM-DD.',
        code: 'INVALID_SHIFT_DATE',
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Lock pessimista na máquina para serializar concorrência estrita
        const machines = await tx.$queryRaw<Array<{ id: string; status: MachineStatus; isActive: boolean }>>`
          SELECT id, status, "isActive"
          FROM "machines"
          WHERE id = ${dto.machineId}::uuid
          FOR UPDATE
        `;

        if (!machines || machines.length === 0) {
          throw new NotFoundException(`Máquina com identificador '${dto.machineId}' não encontrada.`);
        }

        const machine = machines[0];

        if (!machine.isActive || machine.status === MachineStatus.INACTIVE) {
          throw new UnprocessableEntityException({
            message: 'Máquina está inativa e não pode receber alocações de turno.',
            code: 'MACHINE_INACTIVE',
          });
        }

        // 2. Verificar se o turno existe e está ativo
        const shift = await tx.shift.findUnique({
          where: { id: dto.shiftId },
        });

        if (!shift) {
          throw new NotFoundException(`Turno com identificador '${dto.shiftId}' não encontrado.`);
        }

        if (!shift.isActive) {
          throw new UnprocessableEntityException({
            message: 'O turno selecionado está inativo.',
            code: 'SHIFT_INACTIVE',
          });
        }

        // 3. Verificar se o operador já possui alguma alocação ativa (exclusividade do operador)
        const activeOperatorAllocation = await tx.shiftAllocation.findFirst({
          where: {
            operatorId,
            status: ShiftAllocationStatus.ACTIVE,
          },
        });

        if (activeOperatorAllocation) {
          throw new ConflictException({
            title: 'Conflito de Alocação de Operador',
            message: 'Operador já possui uma alocação ativa em andamento.',
            code: 'OPERATOR_ALREADY_ALLOCATED',
          });
        }

        // 4. Verificar se a máquina já possui alocação ativa no turno/data (RN-01)
        const activeAllocation = await tx.shiftAllocation.findFirst({
          where: {
            machineId: dto.machineId,
            shiftId: dto.shiftId,
            shiftDate,
            status: ShiftAllocationStatus.ACTIVE,
          },
        });

        if (activeAllocation) {
          throw new ConflictException({
            title: 'Conflito de Alocação de Máquina',
            message: 'Máquina já possui alocação ativa neste turno por outro operador.',
            code: 'MACHINE_ALREADY_ALLOCATED',
          });
        }

        // 5. Inserir a nova alocação com status ACTIVE
        const allocation = await tx.shiftAllocation.create({
          data: {
            machineId: dto.machineId,
            shiftId: dto.shiftId,
            operatorId,
            shiftDate,
            status: ShiftAllocationStatus.ACTIVE,
            openedAt: new Date(),
          },
          include: {
            machine: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
              },
            },
            shift: {
              select: {
                id: true,
                name: true,
                startTime: true,
                endTime: true,
              },
            },
            operator: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        });

        // 6. Atualizar atomicamente o status da máquina para RUNNING
        await tx.machine.update({
          where: { id: dto.machineId },
          data: { status: MachineStatus.RUNNING },
        });

        allocation.machine.status = MachineStatus.RUNNING;

        return allocation;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          title: 'Conflito de Alocação de Máquina',
          message: 'Máquina já possui alocação ativa neste turno por outro operador.',
          code: 'MACHINE_ALREADY_ALLOCATED',
        });
      }
      throw error;
    }
  }

  async getCurrent(operatorId: string) {
    const allocation = await this.prisma.shiftAllocation.findFirst({
      where: {
        operatorId,
        status: ShiftAllocationStatus.ACTIVE,
      },
      include: {
        machine: {
          select: {
            id: true,
            code: true,
            name: true,
            model: true,
            status: true,
          },
        },
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
        operator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return allocation ?? null;
  }

  async close(id: string, user: { id: string; role: UserRole }) {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.shiftAllocation.findUnique({
        where: { id },
      });

      if (!allocation) {
        throw new NotFoundException(`Alocação com identificador '${id}' não encontrada.`);
      }

      if (allocation.status === ShiftAllocationStatus.CLOSED) {
        throw new ConflictException({
          title: 'Alocação Já Encerrada',
          message: 'Esta alocação já foi finalizada anteriormente.',
          code: 'ALLOCATION_ALREADY_CLOSED',
        });
      }

      const isOwner = allocation.operatorId === user.id;
      const isManager = user.role === UserRole.GERENTE;

      if (!isOwner && !isManager) {
        throw new ForbiddenException({
          title: 'Acesso Proibido',
          message: 'Você não tem permissão para encerrar a alocação de outro operador.',
          code: 'FORBIDDEN_ALLOCATION',
        });
      }

      const now = new Date();

      // 1. Se houver parada aberta (IN_PROGRESS) vinculada a esta alocação, encerra automaticamente
      const activeDowntimes = await tx.downtimeRecord.findMany({
        where: {
          allocationId: id,
          status: DowntimeStatus.IN_PROGRESS,
        },
      });

      for (const downtime of activeDowntimes) {
        const durationMinutes = Math.floor(
          (now.getTime() - downtime.startTime.getTime()) / 60000,
        );
        await tx.downtimeRecord.update({
          where: { id: downtime.id },
          data: {
            status: DowntimeStatus.RESOLVED,
            endTime: now,
            durationMinutes,
          },
        });
      }

      // 2. Atualizar alocação para CLOSED com data/hora de fechamento
      const closedAllocation = await tx.shiftAllocation.update({
        where: { id },
        data: {
          status: ShiftAllocationStatus.CLOSED,
          closedAt: now,
        },
        include: {
          machine: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
            },
          },
          shift: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
            },
          },
          operator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });

      // 3. Reverter status da máquina para IDLE
      await tx.machine.update({
        where: { id: allocation.machineId },
        data: { status: MachineStatus.IDLE },
      });

      closedAllocation.machine.status = MachineStatus.IDLE;

      return closedAllocation;
    });
  }

  async release(id: string, user: { id: string; role: UserRole }) {
    return this.close(id, user);
  }
}
