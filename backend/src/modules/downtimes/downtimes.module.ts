import { Module } from '@nestjs/common';
import { DowntimesController } from './downtimes.controller';
import { DowntimesService } from './downtimes.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DowntimesController],
  providers: [DowntimesService],
  exports: [DowntimesService],
})
export class DowntimesModule {}
