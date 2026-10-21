import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { DowntimesService } from './downtimes.service';
import { StartDowntimeDto } from './dto/start-downtime.dto';
import { ResolveDowntimeDto } from './dto/resolve-downtime.dto';
import { RetroactiveDowntimeDto } from './dto/retroactive-downtime.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllocationActiveGuard } from '../../common/guards/allocation-active.guard';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('downtimes')
export class DowntimesController {
  constructor(private readonly downtimesService: DowntimesService) {}

  @Post('start')
  @UseGuards(AllocationActiveGuard)
  @Roles(UserRole.OPERADOR, UserRole.GERENTE)
  async start(
    @Body() dto: StartDowntimeDto,
    @CurrentUser() user: { id: string; role: UserRole },
    @Res() res: Response,
  ) {
    const result = await this.downtimesService.start(dto, user);
    const statusCode = result.isDuplicate ? HttpStatus.OK : HttpStatus.CREATED;
    return res.status(statusCode).json(result.data);
  }

  @Post('retroactive')
  @UseGuards(AllocationActiveGuard)
  @Roles(UserRole.OPERADOR, UserRole.GERENTE)
  async createRetroactive(
    @Body() dto: RetroactiveDowntimeDto,
    @CurrentUser() user: { id: string; role: UserRole },
    @Res() res: Response,
  ) {
    const result = await this.downtimesService.createRetroactive(dto, user);
    const statusCode = result.isDuplicate ? HttpStatus.OK : HttpStatus.CREATED;
    return res.status(statusCode).json(result.data);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.OPERADOR, UserRole.GERENTE)
  async resolve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ResolveDowntimeDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.downtimesService.resolve(id, dto, user);
  }

  @Get('allocation/:id')
  async findByAllocation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) allocationId: string,
  ) {
    return this.downtimesService.findByAllocation(allocationId);
  }
}
