import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
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

  @Get('current')
  async getCurrent(
    @CurrentUser('id') operatorId: string,
    @Res() res: Response,
  ) {
    const allocation = await this.allocationsService.getCurrent(operatorId);
    return res.status(HttpStatus.OK).json(allocation ?? null);
  }

  @Patch(':id/release')
  async release(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.allocationsService.release(id, user);
  }
}
