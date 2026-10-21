import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SyncBatchDto, SyncEventType } from './dto/sync-batch.dto';
import {
  UserRole,
  ShiftAllocationStatus,
  MachineStatus,
  DowntimeReason,
  DowntimeStatus,
} from '@prisma/client';

export interface SyncBatchResult {
  success: boolean;
  totalReceived: number;
  processedCount: number;
  ignoredCount: number;
  processedClientUuids: string[];
  ignoredClientUuids: string[];
}

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async processBatch(
    dto: SyncBatchDto,
    user: { id: string; role: UserRole },
  ): Promise<SyncBatchResult> {
    const processedClientUuids: string[] = [];
    const ignoredClientUuids: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      for (const event of dto.events) {
        if (event.type === SyncEventType.PRODUCTION) {
          // 1. Verificar idempotência na tabela production_entries (RN-07)
          const existing = await tx.productionEntry.findUnique({
            where: { clientUuid: event.clientUuid },
          });

          if (existing) {
            ignoredClientUuids.push(event.clientUuid);
            continue;
          }

          const { allocationId, quantity, timestamp } = event.payload;

          if (!allocationId || typeof allocationId !== 'string') {
            throw new BadRequestException({
              title: 'Requisição Inválida',
              message: 'Campo allocationId é obrigatório no evento de produção.',
              code: 'MISSING_ALLOCATION_ID',
            });
          }

          // 2. RN-02: Validar quantidade estritamente positiva (Q >= 1)
          if (
            typeof quantity !== 'number' ||
            quantity <= 0 ||
            !Number.isInteger(quantity)
          ) {
            throw new UnprocessableEntityException({
              title: 'Entidade Improcessável',
              message: 'Quantidade de garrafas deve ser um número inteiro maior que zero.',
              code: 'INVALID_QUANTITY',
            });
          }

          // 3. RN-05: Validar timestamp (não pode estar no futuro)
          const eventTime = new Date(timestamp);
          if (isNaN(eventTime.getTime())) {
            throw new BadRequestException({
              title: 'Requisição Inválida',
              message: 'Timestamp deve ser uma data e hora ISO 8601 válida.',
              code: 'INVALID_TIMESTAMP',
            });
          }

          if (eventTime.getTime() > now.getTime()) {
            throw new UnprocessableEntityException({
              title: 'Entidade Improcessável',
              message: 'O horário informado não pode estar no futuro.',
              code: 'FUTURE_TIMESTAMP',
            });
          }

          // 4. Buscar a alocação de turno
          const allocation = await tx.shiftAllocation.findUnique({
            where: { id: allocationId },
          });

          if (!allocation) {
            throw new NotFoundException(
              `Alocação com identificador '${allocationId}' não encontrada.`,
            );
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

          // 7. Persistir apontamento de produção
          await tx.productionEntry.create({
            data: {
              clientUuid: event.clientUuid,
              allocationId,
              quantity,
              timestamp: eventTime,
            },
          });

          processedClientUuids.push(event.clientUuid);
        } else if (event.type === SyncEventType.DOWNTIME) {
          // 1. Verificar idempotência na tabela downtime_records (RN-07)
          const existing = await tx.downtimeRecord.findUnique({
            where: { clientUuid: event.clientUuid },
          });

          if (existing) {
            ignoredClientUuids.push(event.clientUuid);
            continue;
          }

          const {
            allocationId,
            reason,
            justification,
            startTime,
            endTime,
          } = event.payload;

          if (!allocationId || typeof allocationId !== 'string') {
            throw new BadRequestException({
              title: 'Requisição Inválida',
              message: 'Campo allocationId é obrigatório no evento de parada.',
              code: 'MISSING_ALLOCATION_ID',
            });
          }

          // Validar enum motivo de parada
          if (!reason || !Object.values(DowntimeReason).includes(reason)) {
            throw new BadRequestException({
              title: 'Requisição Inválida',
              message: 'Motivo de parada ausente ou inválido.',
              code: 'INVALID_DOWNTIME_REASON',
            });
          }

          // 2. RN-04: Validação condicional de justificativa (Zero Fallback)
          let finalJustification: string | null = null;
          if (reason === DowntimeReason.OUTROS) {
            if (
              !justification ||
              typeof justification !== 'string' ||
              justification.trim().length === 0
            ) {
              throw new BadRequestException({
                title: 'Requisição Inválida',
                message:
                  'A justificativa detalhada é obrigatória para paradas com motivo OUTROS (mínimo de 5 caracteres).',
                code: 'JUSTIFICATION_REQUIRED',
              });
            }
            if (justification.trim().length < 5) {
              throw new BadRequestException({
                title: 'Requisição Inválida',
                message:
                  'A justificativa para o motivo OUTROS deve conter pelo menos 5 caracteres.',
                code: 'JUSTIFICATION_TOO_SHORT',
              });
            }
            finalJustification = justification.trim();
          }

          // 3. RN-05: Validar timestamps
          const start = new Date(startTime);
          if (isNaN(start.getTime())) {
            throw new BadRequestException({
              title: 'Requisição Inválida',
              message: 'startTime deve ser uma data ISO 8601 válida.',
              code: 'INVALID_START_TIME',
            });
          }

          if (start.getTime() > now.getTime()) {
            throw new UnprocessableEntityException({
              title: 'Entidade Improcessável',
              message: 'O horário de início da parada não pode estar no futuro.',
              code: 'FUTURE_TIMESTAMP',
            });
          }

          // 4. Buscar a alocação de turno
          const allocation = await tx.shiftAllocation.findUnique({
            where: { id: allocationId },
            include: { machine: true },
          });

          if (!allocation) {
            throw new NotFoundException(
              `Alocação com identificador '${allocationId}' não encontrada.`,
            );
          }

          // 5. RN-06: Imutabilidade de turno fechado
          if (allocation.status === ShiftAllocationStatus.CLOSED) {
            throw new ForbiddenException({
              title: 'Acesso Proibido',
              message: 'Este turno já foi encerrado e não aceita novos apontamentos.',
              code: 'SHIFT_CLOSED',
            });
          }

          // 6. RN-08: Restrição ao operador alocado ou Gerente
          const isOwner = allocation.operatorId === user.id;
          const isManager = user.role === UserRole.GERENTE;

          if (!isOwner && !isManager) {
            throw new ForbiddenException({
              title: 'Acesso Proibido',
              message: 'Operador não possui alocação ativa nesta máquina.',
              code: 'FORBIDDEN_ALLOCATION',
            });
          }

          // 7. Diferenciar parada consolidada (com endTime) ou em andamento (sem endTime)
          if (endTime) {
            const end = new Date(endTime);
            if (isNaN(end.getTime())) {
              throw new BadRequestException({
                title: 'Requisição Inválida',
                message: 'endTime deve ser uma data ISO 8601 válida.',
                code: 'INVALID_END_TIME',
              });
            }

            if (end.getTime() > now.getTime()) {
              throw new UnprocessableEntityException({
                title: 'Entidade Improcessável',
                message: 'O horário de término da parada não pode estar no futuro.',
                code: 'FUTURE_TIMESTAMP',
              });
            }

            // RN-03: Validação de sequência cronológica
            if (end.getTime() < start.getTime()) {
              throw new UnprocessableEntityException({
                title: 'Entidade Improcessável',
                message: 'O horário de término da parada não pode ser anterior ao horário de início.',
                code: 'INVALID_DOWNTIME_RANGE',
              });
            }

            const durationMinutes = Math.floor(
              (end.getTime() - start.getTime()) / 60000,
            );

            await tx.downtimeRecord.create({
              data: {
                clientUuid: event.clientUuid,
                allocationId,
                reason,
                justification: finalJustification,
                status: DowntimeStatus.RESOLVED,
                startTime: start,
                endTime: end,
                durationMinutes,
              },
            });
          } else {
            // Parada em andamento (IN_PROGRESS)
            const activeDowntime = await tx.downtimeRecord.findFirst({
              where: {
                allocation: { machineId: allocation.machineId },
                status: DowntimeStatus.IN_PROGRESS,
              },
            });

            if (activeDowntime) {
              throw new ConflictException({
                title: 'Conflito de Estado',
                message: `A máquina '${allocation.machine.name}' já possui uma ocorrência de parada em andamento.`,
                code: 'CONFLICT_DOWNTIME_ACTIVE',
              });
            }

            await tx.downtimeRecord.create({
              data: {
                clientUuid: event.clientUuid,
                allocationId,
                reason,
                justification: finalJustification,
                status: DowntimeStatus.IN_PROGRESS,
                startTime: start,
                endTime: null,
                durationMinutes: null,
              },
            });

            // Atualiza status operacional da máquina para STOPPED
            await tx.machine.update({
              where: { id: allocation.machineId },
              data: { status: MachineStatus.STOPPED },
            });
          }

          processedClientUuids.push(event.clientUuid);
        }
      }
    });

    return {
      success: true,
      totalReceived: dto.events.length,
      processedCount: processedClientUuids.length,
      ignoredCount: ignoredClientUuids.length,
      processedClientUuids,
      ignoredClientUuids,
    };
  }
}
