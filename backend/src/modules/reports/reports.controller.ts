import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CsvGenerator } from './generators/csv.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { ReportFilterDto } from './dto/report-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly csvGenerator: CsvGenerator,
    private readonly pdfGenerator: PdfGenerator,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.GERENTE)
  async getDashboard(@Query() filters: ReportFilterDto) {
    return this.reportsService.getDashboardMetrics(filters);
  }

  @Get('csv')
  @Roles(UserRole.GERENTE)
  async downloadCsv(
    @Query() filters: ReportFilterDto,
    @Res() res: Response,
  ): Promise<void> {
    const rows = await this.reportsService.getDetailedAllocationRows(filters);
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const filename = `relatorio-producao-sgms-${dateSuffix}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await this.csvGenerator.generate(rows, res);
  }

  @Get('pdf')
  @Roles(UserRole.GERENTE)
  async downloadPdf(
    @Query() filters: ReportFilterDto,
    @CurrentUser() user: { id: string; name: string; role: UserRole },
    @Res() res: Response,
  ): Promise<void> {
    const [metrics, rows] = await Promise.all([
      this.reportsService.getDashboardMetrics(filters),
      this.reportsService.getDetailedAllocationRows(filters),
    ]);

    const dateSuffix = new Date().toISOString().slice(0, 10);
    const filename = `relatorio-gerencial-sgms-${dateSuffix}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await this.pdfGenerator.generate(
      {
        metrics,
        rows,
        metadata: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          generatedAt: new Date(),
          generatedBy: user.name,
        },
      },
      res,
    );
  }
}

