import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { Writable } from 'stream';
import { PdfReportData, AllocationReportRow } from '../interfaces/dashboard-metrics.interface';

@Injectable()
export class PdfGenerator {
  private readonly PAGE_MARGIN = 40;
  private readonly PAGE_WIDTH = 595.28; // A4
  private readonly PAGE_HEIGHT = 841.89; // A4
  private readonly CONTENT_WIDTH = 595.28 - 2 * 40; // 515.28 pt
  private readonly PAGE_BOTTOM_LIMIT = 841.89 - 50; // limite para rodapé

  /**
   * Compila o relatório analítico em formato PDF corporativo via PDFKit e transmite para o stream de saída.
   */
  async generate(data: PdfReportData, outputStream: Writable): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: this.PAGE_MARGIN,
        bufferPages: true,
        autoFirstPage: true,
      });

      doc.on('error', (err) => reject(err));
      outputStream.on('error', (err) => reject(err));
      outputStream.on('finish', () => resolve());

      doc.pipe(outputStream);

      // 1. Cabeçalho Corporativo
      this.drawHeader(doc, data);

      // 2. Quadro Resumo de KPIs
      this.drawKpiCards(doc, data);

      // 3. Tabela Pareto de Paradas
      this.drawParetoTable(doc, data);

      // 4. Tabela Detalhada de Alocações
      this.drawAllocationsTable(doc, data);

      // 5. Numeração de Páginas no Rodapé ("Página X de Y")
      this.drawFooters(doc);

      doc.end();
    });
  }

  /**
   * Desenha o cabeçalho corporativo com títulos, subtítulo e metadados.
   */
  private drawHeader(doc: PDFKit.PDFDocument, data: PdfReportData): void {
    const startX = this.PAGE_MARGIN;
    let currentY = this.PAGE_MARGIN;

    // Título Principal
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('GEPF AGROINDÚSTRIA — SGMS', startX, currentY);

    currentY += 20;

    // Subtítulo
    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#475569')
      .text('Relatório Analítico de Produção e Disponibilidade de Linha', startX, currentY);

    currentY += 18;

    // Formatação de datas
    const formattedPeriod = `${this.formatDate(data.metadata.startDate)} a ${this.formatDate(data.metadata.endDate)}`;
    const formattedEmission = this.formatDateTime(data.metadata.generatedAt);

    // Bloco de Metadados
    doc.fontSize(8).font('Helvetica').fillColor('#64748b');
    doc.text(
      `Período Analisado: ${formattedPeriod}   |   Emissão: ${formattedEmission}   |   Gerado por: ${data.metadata.generatedBy}`,
      startX,
      currentY,
    );

    currentY += 15;

    // Divisor Horizontal
    doc
      .strokeColor('#cbd5e1')
      .lineWidth(0.75)
      .moveTo(startX, currentY)
      .lineTo(startX + this.CONTENT_WIDTH, currentY)
      .stroke();

    doc.y = currentY + 12;
  }

  /**
   * Desenha os cards resumo com os KPIs consolidados da linha.
   */
  private drawKpiCards(doc: PDFKit.PDFDocument, data: PdfReportData): void {
    const cardGap = 10;
    const cardCount = 3;
    const cardWidth = (this.CONTENT_WIDTH - cardGap * (cardCount - 1)) / cardCount;
    const cardHeight = 48;
    const startX = this.PAGE_MARGIN;
    const startY = doc.y;

    const cards = [
      {
        label: 'TOTAL DE GARRAFAS BOAS',
        value: data.metrics.totalBottles.toLocaleString('pt-BR'),
        color: '#0f172a',
      },
      {
        label: 'TEMPO TOTAL PARADO',
        value: `${data.metrics.totalDowntimeMinutes} min`,
        color: '#dc2626',
      },
      {
        label: 'TAXA DE DISPONIBILIDADE',
        value: `${data.metrics.availabilityPercentage}%`,
        color: data.metrics.availabilityPercentage >= 85 ? '#16a34a' : '#d97706',
      },
    ];

    cards.forEach((card, index) => {
      const cardX = startX + index * (cardWidth + cardGap);

      // Fundo e borda arredondada do card
      doc
        .roundedRect(cardX, startY, cardWidth, cardHeight, 4)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      // Rótulo do KPI
      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#64748b')
        .text(card.label, cardX + 8, startY + 8, { width: cardWidth - 16 });

      // Valor numérico do KPI
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(card.color)
        .text(card.value, cardX + 8, startY + 24, { width: cardWidth - 16 });
    });

    doc.y = startY + cardHeight + 16;
  }

  /**
   * Desenha a tabela com a distribuição de paradas por Pareto.
   */
  private drawParetoTable(doc: PDFKit.PDFDocument, data: PdfReportData): void {
    const startX = this.PAGE_MARGIN;

    // Título da Seção
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Análise de Paradas por Motivo (Pareto)', startX, doc.y);

    doc.y += 6;

    // Cabeçalho da Tabela
    const headerY = doc.y;
    const headerHeight = 18;

    doc
      .rect(startX, headerY, this.CONTENT_WIDTH, headerHeight)
      .fillAndStroke('#f1f5f9', '#e2e8f0');

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
    doc.text('Motivo da Parada', startX + 6, headerY + 5, { width: 220 });
    doc.text('Ocorrências', startX + 230, headerY + 5, { width: 70, align: 'right' });
    doc.text('Minutos Totais', startX + 310, headerY + 5, { width: 90, align: 'right' });
    doc.text('% Tempo Parado', startX + 410, headerY + 5, { width: 95, align: 'right' });

    let currentY = headerY + headerHeight;

    if (data.metrics.pareto.length === 0) {
      doc
        .rect(startX, currentY, this.CONTENT_WIDTH, 18)
        .fillAndStroke('#ffffff', '#f1f5f9');

      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#64748b')
        .text('Nenhuma parada registrada no período selecionado.', startX + 6, currentY + 5);

      currentY += 18;
    } else {
      data.metrics.pareto.forEach((item, index) => {
        const rowHeight = 16;
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';

        doc
          .rect(startX, currentY, this.CONTENT_WIDTH, rowHeight)
          .fillAndStroke(rowBg, '#f1f5f9');

        doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b');
        doc.text(item.reasonLabel, startX + 6, currentY + 4, { width: 220 });
        doc.text(item.occurrences.toString(), startX + 230, currentY + 4, {
          width: 70,
          align: 'right',
        });
        doc.text(`${item.totalMinutes} min`, startX + 310, currentY + 4, {
          width: 90,
          align: 'right',
        });
        doc.text(`${item.percentage}%`, startX + 410, currentY + 4, {
          width: 95,
          align: 'right',
        });

        currentY += rowHeight;
      });
    }

    doc.y = currentY + 16;
  }

  /**
   * Desenha a tabela detalhada de turnos e alocações com paginação automática.
   */
  private drawAllocationsTable(doc: PDFKit.PDFDocument, data: PdfReportData): void {
    const startX = this.PAGE_MARGIN;

    // Verificar se há espaço para o título e o cabeçalho antes de começar
    if (doc.y + 40 > this.PAGE_BOTTOM_LIMIT) {
      doc.addPage();
    }

    // Título da Seção
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Detalhamento por Alocação de Turno', startX, doc.y);

    doc.y += 6;

    this.drawAllocationsTableHeader(doc);

    if (data.rows.length === 0) {
      const currentY = doc.y;
      doc
        .rect(startX, currentY, this.CONTENT_WIDTH, 18)
        .fillAndStroke('#ffffff', '#f1f5f9');

      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor('#64748b')
        .text('Nenhuma alocação localizada para os filtros informados.', startX + 6, currentY + 5);

      doc.y = currentY + 18;
      return;
    }

    data.rows.forEach((row, index) => {
      const rowHeight = 16;

      // Quebra de página automática com re-desenho de cabeçalho
      if (doc.y + rowHeight > this.PAGE_BOTTOM_LIMIT) {
        doc.addPage();
        this.drawAllocationsTableHeader(doc);
      }

      const currentY = doc.y;
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';

      doc
        .rect(startX, currentY, this.CONTENT_WIDTH, rowHeight)
        .fillAndStroke(rowBg, '#f1f5f9');

      doc.fontSize(7).font('Helvetica').fillColor('#1e293b');

      // Data formatada DD/MM/YYYY
      const formattedDate = this.formatDate(row.date);
      doc.text(formattedDate, startX + 4, currentY + 4, { width: 48 });

      // Turno
      doc.text(row.shiftName, startX + 54, currentY + 4, { width: 55, lineBreak: false });

      // Máquina
      const machineText = row.machineName ? `${row.machineCode}` : row.machineCode;
      doc.text(machineText, startX + 112, currentY + 4, { width: 55, lineBreak: false });

      // Operador
      doc.text(row.operatorName, startX + 170, currentY + 4, { width: 75, lineBreak: false });

      // Garrafas Boas
      doc.text(row.goodBottles.toLocaleString('pt-BR'), startX + 250, currentY + 4, {
        width: 48,
        align: 'right',
      });

      // Parada (min)
      doc.text(row.downtimeMinutes.toString(), startX + 302, currentY + 4, {
        width: 45,
        align: 'right',
      });

      // Disponibilidade %
      doc.text(`${row.availabilityPercentage}%`, startX + 352, currentY + 4, {
        width: 45,
        align: 'right',
      });

      // Principal Gargalo (Zero Fallback: vazio se null, sem "N/A")
      const bottleneckText = row.mainBottleneck ?? '';
      doc.text(bottleneckText, startX + 405, currentY + 4, {
        width: 105,
        lineBreak: false,
      });

      doc.y = currentY + rowHeight;
    });
  }

  /**
   * Cabeçalho repetível para a tabela detalhada de alocações.
   */
  private drawAllocationsTableHeader(doc: PDFKit.PDFDocument): void {
    const startX = this.PAGE_MARGIN;
    const headerY = doc.y;
    const headerHeight = 18;

    doc
      .rect(startX, headerY, this.CONTENT_WIDTH, headerHeight)
      .fillAndStroke('#f1f5f9', '#e2e8f0');

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#334155');
    doc.text('Data', startX + 4, headerY + 5, { width: 48 });
    doc.text('Turno', startX + 54, headerY + 5, { width: 55 });
    doc.text('Máquina', startX + 112, headerY + 5, { width: 55 });
    doc.text('Operador', startX + 170, headerY + 5, { width: 75 });
    doc.text('Garrafas', startX + 250, headerY + 5, { width: 48, align: 'right' });
    doc.text('Parada', startX + 302, headerY + 5, { width: 45, align: 'right' });
    doc.text('Disp. (%)', startX + 352, headerY + 5, { width: 45, align: 'right' });
    doc.text('Principal Gargalo', startX + 405, headerY + 5, { width: 105 });

    doc.y = headerY + headerHeight;
  }

  /**
   * Desenha rodapés com numeração "Página X de Y" em todas as páginas criadas no documento.
   */
  private drawFooters(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = range.start; i < range.start + totalPages; i++) {
      doc.switchToPage(i);

      // Linha separadora do rodapé
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .moveTo(this.PAGE_MARGIN, this.PAGE_HEIGHT - 35)
        .lineTo(this.PAGE_MARGIN + this.CONTENT_WIDTH, this.PAGE_HEIGHT - 35)
        .stroke();

      // Texto de confidencialidade à esquerda
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(
          'SGMS — Sistema de Gestão de Máquinas de Sopro | Confidencial GEPF Agroindústria',
          this.PAGE_MARGIN,
          this.PAGE_HEIGHT - 28,
        );

      // Numeração "Página X de Y" à direita
      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor('#64748b')
        .text(
          `Página ${i + 1} de ${totalPages}`,
          this.PAGE_MARGIN,
          this.PAGE_HEIGHT - 28,
          { width: this.CONTENT_WIDTH, align: 'right' },
        );
    }
  }

  /**
   * Formata strings 'YYYY-MM-DD' para 'DD/MM/YYYY'.
   */
  private formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }

  /**
   * Formata Date para 'DD/MM/YYYY HH:mm:ss'.
   */
  private formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}
