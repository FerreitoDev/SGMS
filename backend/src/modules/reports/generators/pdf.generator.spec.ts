import { PdfGenerator } from './pdf.generator';
import { PassThrough } from 'stream';
import {
  PdfReportData,
  DashboardMetrics,
  AllocationReportRow,
} from '../interfaces/dashboard-metrics.interface';
import { DowntimeReason } from '@prisma/client';

describe('PdfGenerator', () => {
  let generator: PdfGenerator;

  beforeEach(() => {
    generator = new PdfGenerator();
  });

  function createMockData(rowCount: number = 3): PdfReportData {
    const metrics: DashboardMetrics = {
      totalBottles: 15420,
      totalDowntimeMinutes: 45,
      totalPlannedMinutes: 480,
      availabilityPercentage: 90.6,
      averagePaceBottlesPerHour: 2126.9,
      pareto: [
        {
          reason: DowntimeReason.ELETRICA,
          reasonLabel: 'Elétrica',
          occurrences: 1,
          totalMinutes: 30,
          percentage: 66.7,
          cumulativePercentage: 66.7,
        },
        {
          reason: DowntimeReason.MOLDE,
          reasonLabel: 'Molde',
          occurrences: 1,
          totalMinutes: 15,
          percentage: 33.3,
          cumulativePercentage: 100,
        },
      ],
    };

    const rows: AllocationReportRow[] = Array.from({ length: rowCount }, (_, i) => ({
      allocationId: `alloc-uuid-${i + 1}`,
      date: '2026-10-21',
      shiftName: i % 2 === 0 ? 'Turno Manhã' : 'Turno Tarde',
      machineCode: `SOP-0${(i % 3) + 1}`,
      machineName: `Sopradora 0${(i % 3) + 1}`,
      operatorName: `Operador ${i + 1}`,
      goodBottles: 5140,
      downtimeMinutes: i === 0 ? 30 : i === 1 ? 15 : 0,
      plannedMinutes: 480,
      availabilityPercentage: i === 0 ? 93.8 : i === 1 ? 96.9 : 100,
      paceBottlesPerHour: 685.3,
      mainBottleneck: i === 0 ? 'Queda de Energia' : i === 1 ? 'Troca de Molde' : null,
    }));

    return {
      metrics,
      rows,
      metadata: {
        startDate: '2026-10-01',
        endDate: '2026-10-21',
        generatedAt: new Date('2026-10-21T18:00:00Z'),
        generatedBy: 'Carlos Gerente',
      },
    };
  }

  it('deve gerar um documento PDF válido iniciando com a assinatura vetorial %PDF-', async () => {
    const data = createMockData(2);
    const stream = new PassThrough();

    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(Buffer.from(c)));

    const generatePromise = generator.generate(data, stream);
    await generatePromise;

    const buffer = Buffer.concat(chunks);
    expect(buffer.length).toBeGreaterThan(1000);
    // Validação da assinatura mágica de arquivo PDF
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('deve renderizar relatório vazio com mensagem apropriada e sem erros', async () => {
    const data: PdfReportData = {
      metrics: {
        totalBottles: 0,
        totalDowntimeMinutes: 0,
        totalPlannedMinutes: 0,
        availabilityPercentage: 0,
        averagePaceBottlesPerHour: 0,
        pareto: [],
      },
      rows: [],
      metadata: {
        startDate: '2026-10-01',
        endDate: '2026-10-21',
        generatedAt: new Date('2026-10-21T18:00:00Z'),
        generatedBy: 'Carlos Gerente',
      },
    };

    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(Buffer.from(c)));

    await generator.generate(data, stream);

    const buffer = Buffer.concat(chunks);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('deve respeitar a regra Zero Fallback omitindo literais fictícios como N/A para gargalo ausente', async () => {
    const data = createMockData(1);
    // Garantir que a linha única tem gargalo estritamente nulo
    data.rows[0].mainBottleneck = null;

    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(Buffer.from(c)));

    await generator.generate(data, stream);

    const buffer = Buffer.concat(chunks);
    const pdfText = buffer.toString('latin1');
    // Não pode conter strings mágicas de fallback
    expect(pdfText).not.toContain('N/A');
    expect(pdfText).not.toContain('undefined');
    expect(pdfText).not.toContain('null');
  });

  it('deve atender ao RNF-05 compilando um relatório com 500 registros em menos de 3 segundos', async () => {
    const data = createMockData(500);
    const stream = new PassThrough();

    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(Buffer.from(c)));

    const startTime = Date.now();
    await generator.generate(data, stream);
    const elapsedMs = Date.now() - startTime;

    const buffer = Buffer.concat(chunks);
    expect(buffer.length).toBeGreaterThan(10000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // RNF-05: Geração de relatório com 500 registros concluída em < 3000ms
    expect(elapsedMs).toBeLessThan(3000);
  });
});
