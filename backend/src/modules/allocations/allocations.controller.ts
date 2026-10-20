import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Post()
  @Roles(UserRole.OPERADOR, UserRole.GERENTE)
  async create(
    @Body() dto: CreateAllocationDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.allocationsService.create(dto, operatorId);
  }
}
