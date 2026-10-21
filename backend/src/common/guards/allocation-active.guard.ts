import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ShiftAllocationStatus, UserRole } from '@prisma/client';

@Injectable()
export class AllocationActiveGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const allocationId =
      request.body?.allocationId ||
      request.params?.allocationId ||
      request.params?.id;

    if (!allocationId || typeof allocationId !== 'string') {
      return true;
    }

    const allocation = await this.prisma.shiftAllocation.findUnique({
      where: { id: allocationId },
      include: { machine: true },
    });

    if (!allocation) {
      throw new NotFoundException(
        `Alocação com identificador '${allocationId}' não encontrada.`,
      );
    }

    if (
      allocation.status === ShiftAllocationStatus.CLOSED &&
      request.user?.role !== UserRole.GERENTE
    ) {
      throw new ForbiddenException({
        title: 'Acesso Proibido',
        message: 'Este turno já foi encerrado e não aceita novos apontamentos.',
        code: 'SHIFT_CLOSED',
      });
    }

    request.allocation = allocation;
    return true;
  }
}
