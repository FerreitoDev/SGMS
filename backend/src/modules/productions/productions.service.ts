import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { ShiftAllocationStatus, UserRole, ProductionEntry } from '@prisma/client';
import {
  assertNotFutureDate,
  assertShiftDateWindow,
} from '../../common/validators/is-not-future-date.validator';

export interface ProductionCreateResult {
  data: ProductionEntry;
  isDuplicate: boolean;
}

@Injectable()
export class ProductionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateProductionDto,
    user: { id: string; role: UserRole },
  ): Promise<ProductionCreateResult> {
    // 1. RN-02: Validar quantidade estritamente positiva (Q >= 1)
    if (dto.quantity <= 0 || !Number.isInteger(dto.quantity)) {
      throw new UnprocessableEntityException({
        title: 'Entidade Improcessável',
        message: 'Quantidade de garrafas deve ser um número inteiro maior que zero.',
        code: 'INVALID_QUANTITY',
      });
    }

    // 2. RN-05: Validar timestamp (bloqueio de data futura com tolerância máxima de 2 min)
    const eventTime = assertNotFutureDate(dto.timestamp, 'O horário informado');

    // 3. RN-07: Idempotência radical por clientUuid
    const existing = await this.prisma.productionEntry.findUnique({
      where: { clientUuid: dto.clientUuid },
    });

    if (existing) {
      return {
        data: existing,
        isDuplicate: true,
      };
    }

    // 4. Buscar a alocação de turno
    const allocation = await this.prisma.shiftAllocation.findUnique({
      where: { id: dto.allocationId },
    });

    if (!allocation) {
      throw new NotFoundException(`Alocação com identificador '${dto.allocationId}' não encontrada.`);
    }

    // 4.1. RN-05: Validar consistência com a data do turno da alocação
    assertShiftDateWindow(
      eventTime,
      allocation.shiftDate,
      'O apontamento de produção',
      allocation.status === ShiftAllocationStatus.ACTIVE,
    );

    // 5. RN-06: Imutabilidade de turno fechado para operadores
    if (
      allocation.status === ShiftAllocationStatus.CLOSED &&
      user.role !== UserRole.GERENTE
    ) {
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

    // 7. Persistir o apontamento de produção
    const created = await this.prisma.productionEntry.create({
      data: {
        clientUuid: dto.clientUuid,
        allocationId: dto.allocationId,
        quantity: dto.quantity,
        timestamp: eventTime,
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

    const entries = await this.prisma.productionEntry.findMany({
      where: { allocationId },
      orderBy: { timestamp: 'asc' },
    });

    const totalQuantity = entries.reduce((acc, entry) => acc + entry.quantity, 0);

    return {
      allocationId,
      totalQuantity,
      entries,
    };
  }
}
