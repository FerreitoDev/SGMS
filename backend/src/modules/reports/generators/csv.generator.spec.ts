import { CsvGenerator } from './csv.generator';
import { AllocationReportRow } from '../interfaces/dashboard-metrics.interface';
import { Writable } from 'stream';

describe('CsvGenerator', () => {
  let generator: CsvGenerator;

  beforeEach(() => {
    generator = new CsvGenerator();
  });

  // Helper para capturar stream em string
  function createMemoryStream(): { stream: Writable; getBuffer: () => Buffer; getText: () => string } {
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    return {
      stream,
      getBuffer: () => Buffer.concat(chunks),
      getText: () => Buffer.concat(chunks).toString('utf-8'),
    };
  }

  it('deve incluir o caractere BOM UTF-8 (\\uFEFF) no início do arquivo', async () => {
    const mem = createMemoryStream();
    await generator.generate([], mem.stream);

    const buffer = mem.getBuffer();
    // UTF-8 BOM em bytes é 0xEF, 0xBB, 0xBF
    expect(buffer[0]).toBe(0xef);
    expect(buffer[1]).toBe(0xbb);
    expect(buffer[2]).toBe(0xbf);
  });

  it('deve formatar cabeçalhos com delimitador ponto-e-vírgula e aspas', async () => {
    const mem = createMemoryStream();
    await generator.generate([], mem.stream);

    const text = mem.getText();
    expect(text).toContain(
      '"Data";"Turno";"Máquina";"Operador";"Garrafas Boas";"Tempo Parado (min)";"Disponibilidade (%)";"Ritmo (garrafas/h)";"Principal Gargalo"',
    );
  });

  it('deve formatar linhas de dados e respeitar Zero Fallback em campos vazios', async () => {
    const mockRows: AllocationReportRow[] = [
      {
        allocationId: 'alloc-1',
        date: '2026-10-21',
        shiftName: 'Turno Manhã',
        machineCode: 'SOP-01',
        machineName: 'Sopradora 01',
        operatorName: 'João Operador',
        goodBottles: 12000,
        downtimeMinutes: 45,
        plannedMinutes: 480,
        availabilityPercentage: 90.6,
        paceBottlesPerHour: 1655.2,
        mainBottleneck: 'Molde',
      },
      {
        allocationId: 'alloc-2',
        date: '2026-10-21',
        shiftName: 'Turno Tarde',
        machineCode: 'SOP-02',
        machineName: 'Sopradora 02',
        operatorName: 'Maria Operadora',
        goodBottles: 15000,
        downtimeMinutes: 0,
        plannedMinutes: 480,
        availabilityPercentage: 100,
        paceBottlesPerHour: 1875,
        mainBottleneck: null, // Sem gargalo
      },
    ];

    const mem = createMemoryStream();
    await generator.generate(mockRows, mem.stream);

    const text = mem.getText();
    const lines = text.split('\n').filter((l) => l.trim().length > 0);

    // Linha 1 (com gargalo Molde e data formatada DD/MM/YYYY)
    expect(lines[1]).toBe('21/10/2026;Turno Manhã;SOP-01 - Sopradora 01;João Operador;12000;45;90.6%;1655.2;Molde');

    // Linha 2 (sem gargalo: Zero Fallback propaga como campo vazio no final ;)
    expect(lines[2]).toBe('21/10/2026;Turno Tarde;SOP-02 - Sopradora 02;Maria Operadora;15000;0;100%;1875;');
    expect(lines[2]).not.toContain('N/A');
    expect(lines[2]).not.toContain('null');
    expect(lines[2]).not.toContain('undefined');
  });
});
