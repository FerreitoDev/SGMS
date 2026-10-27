import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Cpu,
  Clock,
  Loader2,
  Info,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportsService } from '@/services/reports-service';
import { machinesService } from '@/services/machines-service';
import { shiftsService } from '@/services/shifts-service';
import { triggerBlobDownload, parseBlobErrorResponse } from '@/lib/download-helper';
import { toast } from 'sonner';
import type { ReportFilter } from '@/types/reports';
import type { Machine, Shift } from '@/types/domain';

function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDates(): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = formatDateIso(now);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: formatDateIso(startOfMonth),
    endDate,
  };
}

export function ReportsPage(): React.ReactElement {
  const defaults = getDefaultDates();

  const [startDate, setStartDate] = useState<string>(defaults.startDate);
  const [endDate, setEndDate] = useState<string>(defaults.endDate);
  const [machineId, setMachineId] = useState<string>('');
  const [shiftId, setShiftId] = useState<string>('');

  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(true);

  const [isDownloadingCsv, setIsDownloadingCsv] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Carrega opções de máquinas e turnos para filtros
  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      setIsLoadingOptions(true);
      try {
        const [machinesData, shiftsData] = await Promise.all([
          machinesService.list(),
          shiftsService.list(),
        ]);
        if (isMounted) {
          setMachines(machinesData);
          setShifts(shiftsData);
        }
      } catch {
        if (isMounted) {
          toast.error('Erro ao carregar opções de máquinas e turnos.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const buildFilterPayload = (): ReportFilter | null => {
    if (!startDate || !endDate) {
      toast.error('Informe as datas inicial e final para exportação.');
      return null;
    }

    if (startDate > endDate) {
      toast.error('A data inicial não pode ser superior à data final.');
      return null;
    }

    const filters: ReportFilter = {
      startDate,
      endDate,
    };

    if (machineId && machineId.trim().length > 0) {
      filters.machineId = machineId;
    }

    if (shiftId && shiftId.trim().length > 0) {
      filters.shiftId = shiftId;
    }

    return filters;
  };

  const handleExportCsv = async () => {
    const filters = buildFilterPayload();
    if (!filters) return;

    setIsDownloadingCsv(true);
    try {
      const blob = await reportsService.downloadCsv(filters);
      const filename = `relatorio-producao-${startDate}-a-${endDate}.csv`;
      triggerBlobDownload(blob, filename);
      toast.success('Planilha CSV gerada e baixada com sucesso!');
    } catch (error: unknown) {
      const errorData = axios.isAxiosError(error) ? error.response?.data : null;
      const errorMsg = await parseBlobErrorResponse(errorData);
      toast.error(errorMsg);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    const filters = buildFilterPayload();
    if (!filters) return;

    setIsDownloadingPdf(true);
    try {
      const blob = await reportsService.downloadPdf(filters);
      const filename = `relatorio-executivo-${startDate}-a-${endDate}.pdf`;
      triggerBlobDownload(blob, filename);
      toast.success('Relatório executivo PDF baixado com sucesso!');
    } catch (error: unknown) {
      const errorData = axios.isAxiosError(error) ? error.response?.data : null;
      const errorMsg = await parseBlobErrorResponse(errorData);
      toast.error(errorMsg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const isExporting = isDownloadingCsv || isDownloadingPdf;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Cabeçalho */}
        <div className="border-b border-border/80 pb-5 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Extração de Relatórios Gerenciais
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Exportação oficial de dados consolidados de produção, apontamentos e paradas da linha de sopro (RF-11).
          </p>
        </div>

        {/* Card do Formulário de Filtros */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Parâmetros do Período e Escopo
            </CardTitle>
            <CardDescription className="text-xs">
              Defina o intervalo de datas desejado e opcionalmente restrinja os dados a uma sopradora ou turno específico.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data Inicial */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reportStartDate"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Data Inicial <span className="text-destructive">*</span>
                </label>
                <Input
                  id="reportStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isExporting}
                  className="min-h-[44px] text-xs font-mono"
                  required
                />
              </div>

              {/* Data Final */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reportEndDate"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Data Final <span className="text-destructive">*</span>
                </label>
                <Input
                  id="reportEndDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isExporting}
                  className="min-h-[44px] text-xs font-mono"
                  required
                />
              </div>

              {/* Seletor de Sopradora (Opcional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reportMachine"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Sopradora (Opcional)
                </label>
                <select
                  id="reportMachine"
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  disabled={isExporting || isLoadingOptions}
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Todas as Sopradoras</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Turno (Opcional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reportShift"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Turno (Opcional)
                </label>
                <select
                  id="reportShift"
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  disabled={isExporting || isLoadingOptions}
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Todos os Turnos</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações de Download */}
            <div className="border-t border-border/80 pt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              {/* Botão Secundário: PDF */}
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex min-h-[48px] items-center justify-center gap-2 px-5 text-xs font-semibold touch-manipulation hover:bg-muted"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Gerando PDF Executivo...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 text-rose-500" />
                    <span>Exportar Relatório Executivo (PDF)</span>
                  </>
                )}
              </Button>

              {/* Botão Primário: CSV */}
              <Button
                type="button"
                variant="default"
                size="default"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="flex min-h-[48px] items-center justify-center gap-2 px-5 text-xs font-semibold touch-manipulation shadow-xs"
              >
                {isDownloadingCsv ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                    <span>Processando Planilha CSV...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Exportar Planilha (CSV)</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Guia e Especificações Técnicas dos Formatos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Formato CSV Analítico</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Exporta cada alocação e apontamento em linhas tabulares com separador ponto e vírgula (<code className="font-mono text-[11px] bg-muted px-1 rounded">;</code>) e codificação UTF-8 com BOM, ideal para importação direta no Microsoft Excel e Google Sheets sem corrupção de acentuação.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Compatibilidade com Excel garantida (RN-02)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FileText className="h-4 w-4 text-rose-500" />
                <span>Formato PDF Executivo</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Documento formatado para diretoria e gerência operacional, contendo KPIs consolidados (Volume, Disponibilidade, Tempo Parado e Ritmo Médio) e o ranking decrescente de paradas de linha (Princípio de Pareto 80/20).
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-rose-500 pt-1">
                <Info className="h-3.5 w-3.5" />
                <span>Pronto para impressão em formato A4</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
