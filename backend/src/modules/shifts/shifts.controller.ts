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
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles(UserRole.GERENTE)
  async create(@Body() dto: CreateShiftDto) {
    return this.shiftsService.create(dto);
  }

  @Get()
  async findAll(@Query() query: ListShiftsQueryDto) {
    return this.shiftsService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.shiftsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.GERENTE)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.GERENTE)
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateShiftStatusDto,
  ) {
    return this.shiftsService.updateStatus(id, dto);
  }
}
