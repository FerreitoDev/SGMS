import { apiClient } from '@/lib/api-client';
import { triggerBlobDownload } from '@/lib/download-helper';
import type { DashboardMetrics, ReportFilter } from '@/types/reports';

export const reportsService = {
  /**
   * Obtém métricas e ranking de Pareto consolidados para o dashboard gerencial
   */
  async getDashboardMetrics(filters: ReportFilter): Promise<DashboardMetrics> {
    const response = await apiClient.get<DashboardMetrics>('/reports/dashboard', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Baixa relatório analítico de apontamentos em formato CSV (UTF-8 com BOM e delimitador ';')
   */
  async downloadCsv(filters: ReportFilter): Promise<Blob> {
    const response = await apiClient.get<Blob>('/reports/csv', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Baixa relatório gerencial executivo com gráficos e Pareto em formato PDF
   */
  async downloadPdf(filters: ReportFilter): Promise<Blob> {
    const response = await apiClient.get<Blob>('/reports/pdf', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Helper utilitário para acionar download de arquivo Blob no navegador
   */
  triggerBlobDownload(blob: Blob, filename: string): void {
    triggerBlobDownload(blob, filename);
  },
};

export { triggerBlobDownload };

