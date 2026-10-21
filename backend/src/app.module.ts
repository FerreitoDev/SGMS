import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MachinesModule } from './modules/machines/machines.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AllocationsModule } from './modules/allocations/allocations.module';
import { ProductionsModule } from './modules/productions/productions.module';
import { DowntimesModule } from './modules/downtimes/downtimes.module';
import { SyncModule } from './modules/sync/sync.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MachinesModule,
    ShiftsModule,
    AllocationsModule,
    ProductionsModule,
    DowntimesModule,
    SyncModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
