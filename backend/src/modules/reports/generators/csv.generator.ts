import { Injectable } from '@nestjs/common';
import * as csv from 'fast-csv';
import { Writable } from 'stream';
import { AllocationReportRow } from '../interfaces/dashboard-metrics.interface';

@Injectable()
export class CsvGenerator {
  private readonly headers = [
    'Data',
    'Turno',
    'Máquina',
    'Operador',
    'Garrafas Boas',
    'Tempo Parado (min)',
    'Disponibilidade (%)',
    'Ritmo (garrafas/h)',
    'Principal Gargalo',
  ];

  /**
   * Transmite o relatório analítico no formato CSV com delimitador ';' e BOM UTF-8 para o stream de saída.
   */
  async generate(rows: AllocationReportRow[], outputStream: Writable): Promise<void> {
    return new Promise((resolve, reject) => {
      // Inserir caractere BOM UTF-8 (\uFEFF) para garantir abertura automática no Excel sem corrupção de acentuação
      outputStream.write('\uFEFF');

      if (rows.length === 0) {
        outputStream.write(this.headers.map((h) => `"${h}"`).join(';') + '\r\n');
        outputStream.end();
        return resolve();
      }

      const csvStream = csv.format({
        delimiter: ';',
        headers: this.headers,
        quoteHeaders: true,
      });

      csvStream.on('error', (err) => reject(err));
      outputStream.on('error', (err) => reject(err));

      // Resolve quando a escrita for finalizada no destino
      outputStream.on('finish', () => resolve());

      csvStream.pipe(outputStream);

      for (const row of rows) {
        const [year, month, day] = row.date.split('-');
        const formattedDate = year && month && day ? `${day}/${month}/${year}` : row.date;

        csvStream.write({
          Data: formattedDate,
          Turno: row.shiftName,
          Máquina: row.machineName ? `${row.machineCode} - ${row.machineName}` : row.machineCode,
          Operador: row.operatorName,
          'Garrafas Boas': row.goodBottles,
          'Tempo Parado (min)': row.downtimeMinutes,
          'Disponibilidade (%)': `${row.availabilityPercentage}%`,
          'Ritmo (garrafas/h)': row.paceBottlesPerHour,
          // Zero Fallback: Ausência de gargalo gera campo vazio, nunca "N/A" ou texto artificial
          'Principal Gargalo': row.mainBottleneck ?? '',
        });
      }

      csvStream.end();
    });
  }
}
