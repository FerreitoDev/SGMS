import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ProductionsService } from './productions.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllocationActiveGuard } from '../../common/guards/allocation-active.guard';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('productions')
export class ProductionsController {
  constructor(private readonly productionsService: ProductionsService) {}

  @Post()
  @UseGuards(AllocationActiveGuard)
  @Roles(UserRole.OPERADOR, UserRole.GERENTE)
  async create(
    @Body() dto: CreateProductionDto,
    @CurrentUser() user: { id: string; role: UserRole },
    @Res() res: Response,
  ) {
    const result = await this.productionsService.create(dto, user);
    const statusCode = result.isDuplicate ? HttpStatus.OK : HttpStatus.CREATED;
    return res.status(statusCode).json(result.data);
  }

  @Get('allocation/:id')
  async findByAllocation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) allocationId: string,
  ) {
    return this.productionsService.findByAllocation(allocationId);
  }
}
