import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SyncService, SyncBatchResult } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OPERADOR, UserRole.GERENTE)
  async processBatch(
    @Body() dto: SyncBatchDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ): Promise<SyncBatchResult> {
    return this.syncService.processBatch(dto, user);
  }
}
