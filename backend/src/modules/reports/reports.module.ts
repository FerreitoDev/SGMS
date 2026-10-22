import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CsvGenerator } from './generators/csv.generator';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, CsvGenerator],
  exports: [ReportsService, CsvGenerator],
})
export class ReportsModule {}
