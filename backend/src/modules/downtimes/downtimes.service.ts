import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StartDowntimeDto } from './dto/start-downtime.dto';
import { ResolveDowntimeDto } from './dto/resolve-downtime.dto';
import { RetroactiveDowntimeDto } from './dto/retroactive-downtime.dto';
import {
  DowntimeReason,
  DowntimeStatus,
  MachineStatus,
  ShiftAllocationStatus,
  UserRole,
  DowntimeRecord,
} from '@prisma/client';

export interface DowntimeStartResult {
  data: DowntimeRecord;
  isDuplicate: boolean;
}

@Injectable()
export class DowntimesService {
  constructor(private readonly prisma: PrismaService) {}

  async start(
    dto: StartDowntimeDto,
    user: { id: string; role: UserRole },
  ): Promise<DowntimeStartResult> {
    // 1. RN-05: Validar timestamp de início (não pode ser futuro)
    const startTime = new Date(dto.startTime);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException({
        title: 'Requisição Inválida',
        message: 'startTime deve ser uma data e hora ISO 8601 válida.',
        code: 'INVALID_TIMESTAMP',
      });
    }

    const now = new Date();
    if (startTime.getTime() > now.getTime()) {
      throw new UnprocessableEntityException({
        title: 'Entidade Improcessável',
        message: 'O horário informado não pode estar no futuro.',
        code: 'FUTURE_TIMESTAMP',
      });
    }

    // 2. RN-04: Justificativa obrigatória se OUTROS (>= 5 caracteres), senão null estrito (Zero Fallback)
    let finalJustification: string | null = null;
    if (dto.reason === DowntimeReason.OUTROS) {
      if (!dto.justification || dto.justification.trim().length < 5) {
        throw new BadRequestException({
          title: 'Requisição Inválida',
          message: 'A justificativa detalhada é obrigatória para paradas com motivo OUTROS (mínimo de 5 caracteres).',
          code: 'INVALID_JUSTIFICATION',
        });
      }
      finalJustification = dto.justification.trim();
    }

    // 3. RN-07: Idempotência radical por clientUuid
    const existing = await this.prisma.downtimeRecord.findUnique({
      where: { clientUuid: dto.clientUuid },
    });

    if (existing) {
      return {
        data: existing,
        isDuplicate: true,
      };
    }

    // 4. Buscar e validar alocação de turno
    const allocation = await this.prisma.shiftAllocation.findUnique({
      where: { id: dto.allocationId },
    });

    if (!allocation) {
      throw new NotFoundException(`Alocação com identificador '${dto.allocationId}' não encontrada.`);
    }

    // 5. RN-06: Imutabilidade de turno fechado
    if (allocation.status === ShiftAllocationStatus.CLOSED) {
      throw new ForbiddenException({
        title: 'Acesso Proibido',
        message: 'Este turno já foi encerrado e não aceita novos apontamentos.',
        code: 'SHIFT_CLOSED',
      });
    }

    // 6. RN-08: Restrição de apontamento ao operador alocado ou Gerente
    const isOwner = allocation.operatorId === user.id;
    const isManager = user.role === UserRole.GERENTE;

    if (!isOwner && !isManager) {
      throw new ForbiddenException({
        title: 'Acesso Proibido',
        message: 'Operador não possui alocação ativa nesta máquina.',
        code: 'FORBIDDEN_ALLOCATION',
      });
    }

    // 7. Transação interativa para abertura atômica e alteração da máquina para STOPPED
    const created = await this.prisma.$transaction(async (tx) => {
      // Verificar se já existe parada em andamento nesta alocação
      const activeDowntime = await tx.downtimeRecord.findFirst({
        where: {
          allocationId: dto.allocationId,
          status: DowntimeStatus.IN_PROGRESS,
        },
      });

      if (activeDowntime) {
        throw new ConflictException({
          title: 'Conflito de Regra de Negócio',
          message: 'A máquina já possui uma ocorrência de parada em andamento.',
          code: 'DOWNTIME_ALREADY_IN_PROGRESS',
        });
      }

      const downtime = await tx.downtimeRecord.create({
        data: {
          clientUuid: dto.clientUuid,
          allocationId: dto.allocationId,
          reason: dto.reason,
          justification: finalJustification,
          status: DowntimeStatus.IN_PROGRESS,
          startTime,
          endTime: null,
          durationMinutes: null,
        },
      });

      // Atualizar status da máquina correspondente para STOPPED
      await tx.machine.update({
        where: { id: allocation.machineId },
        data: { status: MachineStatus.STOPPED },
      });

      return downtime;
    });

    return {
      data: created,
      isDuplicate: false,
    };
  }

  async resolve(
    id: string,
    dto: ResolveDowntimeDto,
    user: { id: string; role: UserRole },
  ): Promise<DowntimeRecord> {
    const endTime = new Date(dto.endTime);
    if (isNaN(endTime.getTime())) {
      throw new BadRequestException({
        title: 'Requisição Inválida',
        message: 'endTime deve ser uma data e hora ISO 8601 válida.',
        code: 'INVALID_TIMESTAMP',
      });
    }

    const now = new Date();
    if (endTime.getTime() > now.getTime()) {
      throw new UnprocessableEntityException({
        title: 'Entidade Improcessável',
        message: 'O horário informado não pode estar no futuro.',
        code: 'FUTURE_TIMESTAMP',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const downtime = await tx.downtimeRecord.findUnique({
        where: { id },
        include: { allocation: true },
      });

      if (!downtime) {
        throw new NotFoundException(`Ocorrência de parada com identificador '${id}' não encontrada.`);
      }

      if (downtime.status === DowntimeStatus.RESOLVED) {
        throw new ConflictException({
          title: 'Parada Já Encerrada',
          message: 'Esta ocorrência de parada já foi resolvida anteriormente.',
          code: 'DOWNTIME_ALREADY_RESOLVED',
        });
      }

      // Permissão: Operador alocado ou Gerente
      const isOwner = downtime.allocation.operatorId === user.id;
      const isManager = user.role === UserRole.GERENTE;

      if (!isOwner && !isManager) {
        throw new ForbiddenException({
          title: 'Acesso Proibido',
          message: 'Operador não possui permissão para resolver parada nesta máquina.',
          code: 'FORBIDDEN_ALLOCATION',
        });
      }

      // RN-03: Consistência Cronológica (T_fim >= T_ini)
      if (endTime.getTime() < downtime.startTime.getTime()) {
        throw new UnprocessableEntityException({
          title: 'Entidade Improcessável',
          message: 'O horário de término da parada não pode ser anterior ao horário de início.',
          code: 'INVALID_DOWNTIME_RANGE',
        });
      }

      // Cálculo exato de duração em minutos inteiros: floor((T_fim - T_ini) / 60000)
      const durationMinutes = Math.floor(
        (endTime.getTime() - downtime.startTime.getTime()) / 60000,
      );

      const resolved = await tx.downtimeRecord.update({
        where: { id },
        data: {
          status: DowntimeStatus.RESOLVED,
          endTime,
          durationMinutes,
        },
      });

      // Reverter status da máquina correspondente para RUNNING
      await tx.machine.update({
        where: { id: downtime.allocation.machineId },
        data: { status: MachineStatus.RUNNING },
      });

      return resolved;
    });
  }

  async createRetroactive(
    dto: RetroactiveDowntimeDto,
    user: { id: string; role: UserRole },
  ): Promise<DowntimeStartResult> {
    // 1. Validar timestamps
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException({
        title: 'Requisição Inválida',
        message: 'Os horários de início e término devem ser datas ISO 8601 válidas.',
        code: 'INVALID_TIMESTAMP',
      });
    }

    const now = new Date();
    if (startTime.getTime() > now.getTime() || endTime.getTime() > now.getTime()) {
      throw new UnprocessableEntityException({
        title: 'Entidade Improcessável',
        message: 'O horário informado não pode estar no futuro.',
        code: 'FUTURE_TIMESTAMP',
      });
    }

    // RN-03: Consistência Cronológica (T_fim >= T_ini)
    if (endTime.getTime() < startTime.getTime()) {
      throw new UnprocessableEntityException({
        title: 'Entidade Improcessável',
        message: 'O horário de término da parada não pode ser anterior ao horário de início.',
        code: 'INVALID_DOWNTIME_RANGE',
      });
    }

    // 2. RN-04: Justificativa obrigatória se OUTROS (>= 5 caracteres), senão null estrito (Zero Fallback)
    let finalJustification: string | null = null;
    if (dto.reason === DowntimeReason.OUTROS) {
      if (!dto.justification || dto.justification.trim().length < 5) {
        throw new BadRequestException({
          title: 'Requisição Inválida',
          message: 'A justificativa detalhada é obrigatória para paradas com motivo OUTROS (mínimo de 5 caracteres).',
          code: 'INVALID_JUSTIFICATION',
        });
      }
      finalJustification = dto.justification.trim();
    }

    // 3. RN-07: Idempotência radical por clientUuid
    const existing = await this.prisma.downtimeRecord.findUnique({
      where: { clientUuid: dto.clientUuid },
    });

    if (existing) {
      return {
        data: existing,
        isDuplicate: true,
      };
    }

    // 4. Buscar e validar alocação de turno
    const allocation = await this.prisma.shiftAllocation.findUnique({
      where: { id: dto.allocationId },
    });

    if (!allocation) {
      throw new NotFoundException(`Alocação com identificador '${dto.allocationId}' não encontrada.`);
    }

    // 5. RN-06: Imutabilidade de turno fechado para operadores
    if (allocation.status === ShiftAllocationStatus.CLOSED && user.role !== UserRole.GERENTE) {
      throw new ForbiddenException({
        title: 'Acesso Proibido',
        message: 'Este turno já foi encerrado e não aceita novos apontamentos.',
        code: 'SHIFT_CLOSED',
      });
    }

    // 6. RN-08: Restrição de apontamento ao operador alocado ou Gerente
    const isOwner = allocation.operatorId === user.id;
    const isManager = user.role === UserRole.GERENTE;

    if (!isOwner && !isManager) {
      throw new ForbiddenException({
        title: 'Acesso Proibido',
        message: 'Operador não possui alocação ativa nesta máquina.',
        code: 'FORBIDDEN_ALLOCATION',
      });
    }

    // 7. Cálculo exato da duração em minutos inteiros: floor((T_fim - T_ini) / 60000)
    const durationMinutes = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );

    // 8. Gravar parada consolidada como RESOLVED sem alterar status da máquina
    const created = await this.prisma.downtimeRecord.create({
      data: {
        clientUuid: dto.clientUuid,
        allocationId: dto.allocationId,
        reason: dto.reason,
        justification: finalJustification,
        status: DowntimeStatus.RESOLVED,
        startTime,
        endTime,
        durationMinutes,
      },
    });

    return {
      data: created,
      isDuplicate: false,
    };
  }

  async findByAllocation(allocationId: string) {
    const allocation = await this.prisma.shiftAllocation.findUnique({
      where: { id: allocationId },
    });

    if (!allocation) {
      throw new NotFoundException(`Alocação com identificador '${allocationId}' não encontrada.`);
    }

    const records = await this.prisma.downtimeRecord.findMany({
      where: { allocationId },
      orderBy: { startTime: 'asc' },
    });

    const totalDurationMinutes = records.reduce(
      (acc: number, r: { durationMinutes: number | null }) => acc + (r.durationMinutes ?? 0),
      0,
    );

    const activeDowntime = records.find(
      (r: DowntimeRecord) => r.status === DowntimeStatus.IN_PROGRESS,
    ) ?? null;

    return {
      allocationId,
      totalDurationMinutes,
      activeDowntime,
      records,
    };
  }
}
