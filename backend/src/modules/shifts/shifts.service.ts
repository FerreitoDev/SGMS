import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto';
import { ShiftAllocationStatus, Prisma } from '@prisma/client';

const SHIFT_SELECT_FIELDS = {
  id: true,
  name: true,
  startTime: true,
  endTime: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeTime(time: string): string {
    const trimmed = time.trim();
    const parts = trimmed.split(':');
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async create(dto: CreateShiftDto) {
    const trimmedName = dto.name.trim();
    const normalizedStartTime = this.normalizeTime(dto.startTime);
    const normalizedEndTime = this.normalizeTime(dto.endTime);

    const existingShift = await this.prisma.shift.findFirst({
      where: { name: trimmedName },
    });

    if (existingShift) {
      throw new ConflictException({
        message: `Já existe um turno cadastrado com o nome '${trimmedName}'.`,
        code: 'SHIFT_NAME_ALREADY_EXISTS',
      });
    }

    return this.prisma.shift.create({
      data: {
        name: trimmedName,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        isActive: true,
      },
      select: SHIFT_SELECT_FIELDS,
    });
  }

  async findAll(query?: ListShiftsQueryDto) {
    const whereClause: Prisma.ShiftWhereInput = {};

    if (query?.isActive !== undefined) {
      whereClause.isActive = query.isActive;
    }

    return this.prisma.shift.findMany({
      where: whereClause,
      select: SHIFT_SELECT_FIELDS,
      orderBy: { startTime: 'asc' },
    });
  }

  async findById(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      select: SHIFT_SELECT_FIELDS,
    });

    if (!shift) {
      throw new NotFoundException(`Turno com identificador '${id}' não encontrado.`);
    }

    return shift;
  }

  async update(id: string, dto: UpdateShiftDto) {
    const shift = await this.findById(id);

    const updateData: Prisma.ShiftUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (trimmedName !== shift.name) {
        const existingName = await this.prisma.shift.findFirst({
          where: { name: trimmedName },
        });

        if (existingName) {
          throw new ConflictException({
            message: `Já existe um turno cadastrado com o nome '${trimmedName}'.`,
            code: 'SHIFT_NAME_ALREADY_EXISTS',
          });
        }
      }
      updateData.name = trimmedName;
    }

    if (dto.startTime !== undefined) {
      updateData.startTime = this.normalizeTime(dto.startTime);
    }

    if (dto.endTime !== undefined) {
      updateData.endTime = this.normalizeTime(dto.endTime);
    }

    if (dto.isActive !== undefined) {
      if (!dto.isActive) {
        await this.ensureNoActiveAllocations(id);
      }
      updateData.isActive = dto.isActive;
    }

    return this.prisma.shift.update({
      where: { id },
      data: updateData,
      select: SHIFT_SELECT_FIELDS,
    });
  }

  async updateStatus(id: string, dto: UpdateShiftStatusDto) {
    await this.findById(id);

    if (!dto.isActive) {
      await this.ensureNoActiveAllocations(id);
    }

    return this.prisma.shift.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: SHIFT_SELECT_FIELDS,
    });
  }

  private async ensureNoActiveAllocations(id: string): Promise<void> {
    const activeAllocation = await this.prisma.shiftAllocation.findFirst({
      where: {
        shiftId: id,
        status: ShiftAllocationStatus.ACTIVE,
      },
    });

    if (activeAllocation) {
      throw new ConflictException({
        message: 'Não é possível inativar o turno enquanto houver alocações ativas vinculadas a ele.',
        code: 'SHIFT_HAS_ACTIVE_ALLOCATION',
      });
    }
  }
}
