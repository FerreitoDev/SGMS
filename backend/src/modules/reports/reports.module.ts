import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CsvGenerator } from './generators/csv.generator';
import { PdfGenerator } from './generators/pdf.generator';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, CsvGenerator, PdfGenerator],
  exports: [ReportsService, CsvGenerator, PdfGenerator],
})
export class ReportsModule {}
