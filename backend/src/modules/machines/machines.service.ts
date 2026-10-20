import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { UpdateMachineStatusDto } from './dto/update-machine-status.dto';
import { ListMachinesQueryDto } from './dto/list-machines-query.dto';
import { MachineStatus, ShiftAllocationStatus, Prisma } from '@prisma/client';

const MACHINE_SELECT_FIELDS = {
  id: true,
  code: true,
  name: true,
  model: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMachineDto) {
    const trimmedCode = dto.code.trim();
    const trimmedName = dto.name.trim();
    const trimmedModel = dto.model !== undefined && dto.model !== null ? dto.model.trim() : null;

    const existingMachine = await this.prisma.machine.findUnique({
      where: { code: trimmedCode },
    });

    if (existingMachine) {
      throw new ConflictException({
        message: `O código identificador '${trimmedCode}' já está cadastrado para outra máquina.`,
        code: 'MACHINE_CODE_ALREADY_EXISTS',
      });
    }

    return this.prisma.machine.create({
      data: {
        code: trimmedCode,
        name: trimmedName,
        model: trimmedModel,
        status: MachineStatus.IDLE,
        isActive: true,
      },
      select: MACHINE_SELECT_FIELDS,
    });
  }

  async findAll(query?: ListMachinesQueryDto) {
    const whereClause: Prisma.MachineWhereInput = {};

    if (query?.isActive !== undefined) {
      whereClause.isActive = query.isActive;
    }

    if (query?.status !== undefined) {
      whereClause.status = query.status;
    }

    return this.prisma.machine.findMany({
      where: whereClause,
      select: MACHINE_SELECT_FIELDS,
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      select: MACHINE_SELECT_FIELDS,
    });

    if (!machine) {
      throw new NotFoundException(`Máquina com identificador '${id}' não encontrada.`);
    }

    return machine;
  }

  async update(id: string, dto: UpdateMachineDto) {
    const machine = await this.findById(id);

    const updateData: Prisma.MachineUpdateInput = {};

    if (dto.code !== undefined) {
      const trimmedCode = dto.code.trim();
      if (trimmedCode !== machine.code) {
        const existingCode = await this.prisma.machine.findUnique({
          where: { code: trimmedCode },
        });

        if (existingCode) {
          throw new ConflictException({
            message: `O código identificador '${trimmedCode}' já está cadastrado para outra máquina.`,
            code: 'MACHINE_CODE_ALREADY_EXISTS',
          });
        }
      }
      updateData.code = trimmedCode;
    }

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.model !== undefined) {
      updateData.model = dto.model !== null ? dto.model.trim() : null;
    }

    if (dto.status !== undefined || dto.isActive !== undefined) {
      const statusChanges = await this.resolveStatusChanges(id, machine, {
        status: dto.status,
        isActive: dto.isActive,
      });
      Object.assign(updateData, statusChanges);
    }

    return this.prisma.machine.update({
      where: { id },
      data: updateData,
      select: MACHINE_SELECT_FIELDS,
    });
  }

  async updateStatus(id: string, dto: UpdateMachineStatusDto) {
    const machine = await this.findById(id);

    const statusChanges = await this.resolveStatusChanges(id, machine, dto);

    return this.prisma.machine.update({
      where: { id },
      data: statusChanges,
      select: MACHINE_SELECT_FIELDS,
    });
  }

  private async resolveStatusChanges(
    id: string,
    currentMachine: { status: MachineStatus; isActive: boolean },
    dto: UpdateMachineStatusDto,
  ): Promise<Prisma.MachineUpdateInput> {
    if (dto.status === MachineStatus.RUNNING) {
      throw new BadRequestException({
        message: 'A transição para RUNNING é exclusiva da alocação de um operador na máquina.',
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    const willBeInactive =
      dto.isActive === false || dto.status === MachineStatus.INACTIVE;

    if (willBeInactive) {
      const activeAllocation = await this.prisma.shiftAllocation.findFirst({
        where: {
          machineId: id,
          status: ShiftAllocationStatus.ACTIVE,
        },
      });

      if (activeAllocation) {
        throw new ConflictException({
          message: 'Não é possível inativar a máquina enquanto houver uma alocação ativa vinculada a ela.',
          code: 'MACHINE_HAS_ACTIVE_ALLOCATION',
        });
      }
    }

    const updateData: Prisma.MachineUpdateInput = {};

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
      if (!dto.isActive) {
        updateData.status = MachineStatus.INACTIVE;
      } else if (currentMachine.status === MachineStatus.INACTIVE && dto.status === undefined) {
        updateData.status = MachineStatus.IDLE;
      }
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === MachineStatus.INACTIVE) {
        updateData.isActive = false;
      } else if (dto.status === MachineStatus.IDLE && dto.isActive === undefined && !currentMachine.isActive) {
        updateData.isActive = true;
      }
    }

    return updateData;
  }
}
