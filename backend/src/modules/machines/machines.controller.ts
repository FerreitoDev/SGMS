import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { UpdateMachineStatusDto } from './dto/update-machine-status.dto';
import { ListMachinesQueryDto } from './dto/list-machines-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Post()
  @Roles(UserRole.GERENTE)
  async create(@Body() dto: CreateMachineDto) {
    return this.machinesService.create(dto);
  }

  @Get()
  async findAll(@Query() query: ListMachinesQueryDto) {
    return this.machinesService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.machinesService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.GERENTE)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMachineDto,
  ) {
    return this.machinesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.GERENTE)
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMachineStatusDto,
  ) {
    return this.machinesService.updateStatus(id, dto);
  }
}
