import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  RefreshCw,
  Calendar,
  Cpu,
  AlertCircle,
  Activity,
  PauseCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { ParetoChart } from '@/components/dashboard/pareto-chart';
import { reportsService } from '@/services/reports-service';
import { machinesService } from '@/services/machines-service';
import { toast } from 'sonner';
import type { DashboardMetrics, ReportFilter } from '@/types/reports';
import type { Machine, MachineStatus } from '@/types/domain';

type QuickRangeType = 'today' | '7days' | 'month' | 'custom';

function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getQuickRangeDates(type: 'today' | '7days' | 'month'): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = formatDateIso(now);

  if (type === 'today') {
    return { startDate: endDate, endDate };
  }
  if (type === '7days') {
    const past = new Date(now);
    past.setDate(now.getDate() - 6);
    return { startDate: formatDateIso(past), endDate };
  }
  if (type === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: formatDateIso(startOfMonth), endDate };
  }
  return { startDate: endDate, endDate };
}

const MACHINE_STATUS_CONFIG: Record<
  MachineStatus,
  { label: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  RUNNING: {
    label: 'Em Operação',
    badgeVariant: 'default',
    colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: Activity,
  },
  STOPPED: {
    label: 'Parada',
    badgeVariant: 'destructive',
    colorClass: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: PauseCircle,
  },
  IDLE: {
    label: 'Aguardando',
    badgeVariant: 'outline',
    colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  INACTIVE: {
    label: 'Inativa',
    badgeVariant: 'secondary',
    colorClass: 'bg-muted text-muted-foreground border-border',
    icon: AlertCircle,
  },
};

export function ManagerDashboardPage(): React.ReactElement {
  const initialDates = getQuickRangeDates('today');

  const [activeRange, setActiveRange] = useState<QuickRangeType>('today');
  const [startDate, setStartDate] = useState<string>(initialDates.startDate);
  const [endDate, setEndDate] = useState<string>(initialDates.endDate);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [isLoadingMachines, setIsLoadingMachines] = useState<boolean>(true);

  // Carrega a lista de sopradoras para o painel em tempo real e seletor
  const loadMachines = useCallback(async () => {
    setIsLoadingMachines(true);
    try {
      const data = await machinesService.list();
      setMachines(data);
    } catch {
      toast.error('Erro ao carregar o status das sopradoras.');
    } finally {
      setIsLoadingMachines(false);
    }
  }, []);

  // Carrega as métricas consolidadas do dashboard conforme filtros
  const loadMetrics = useCallback(async (start: string, end: string, machineId?: string) => {
    if (!start || !end) return;

    if (start > end) {
      toast.error('A data inicial não pode ser superior à data final.');
      return;
    }

    setIsLoadingMetrics(true);
    try {
      const filters: ReportFilter = {
        startDate: start,
        endDate: end,
      };

      if (machineId && machineId.trim().length > 0) {
        filters.machineId = machineId;
      }

      const data = await reportsService.getDashboardMetrics(filters);
      setMetrics(data);
    } catch {
      toast.error('Não foi possível carregar as métricas do painel.');
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  // Disparo inicial
  useEffect(() => {
    void loadMachines();
    void loadMetrics(startDate, endDate, selectedMachineId);
  }, [loadMachines, loadMetrics, startDate, endDate, selectedMachineId]);

  // Manipulador de troca de filtro rápido
  const handleSelectQuickRange = (range: 'today' | '7days' | 'month') => {
    setActiveRange(range);
    const dates = getQuickRangeDates(range);
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  };

  // Manipulador de recarga manual
  const handleRefresh = () => {
    void loadMachines();
    void loadMetrics(startDate, endDate, selectedMachineId);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Cabeçalho do Dashboard */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Painel Gerencial de Produção
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Visão consolidada de produtividade, eficiência de sopragem e paradas de linha (GEPF Agroindústria).
            </p>
          </div>

          <Button
            variant="outline"
            size="default"
            onClick={handleRefresh}
            disabled={isLoadingMetrics || isLoadingMachines}
            className="flex min-h-[44px] items-center gap-2 self-start sm:self-auto touch-manipulation font-medium text-xs"
            aria-label="Atualizar dados do dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingMetrics || isLoadingMachines ? 'animate-spin' : ''}`} />
            <span>Atualizar Painel</span>
          </Button>
        </div>

        {/* Barra Superior de Filtros Analíticos */}
        <Card className="border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Atalhos Rápidos de Período */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mr-1">
                <Calendar className="h-3.5 w-3.5" />
                Período:
              </span>

              <Button
                type="button"
                variant={activeRange === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectQuickRange('today')}
                className="min-h-[40px] text-xs font-medium touch-manipulation"
              >
                Hoje
              </Button>

              <Button
                type="button"
                variant={activeRange === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectQuickRange('7days')}
                className="min-h-[40px] text-xs font-medium touch-manipulation"
              >
                Últimos 7 dias
              </Button>

              <Button
                type="button"
                variant={activeRange === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSelectQuickRange('month')}
                className="min-h-[40px] text-xs font-medium touch-manipulation"
              >
                Este Mês
              </Button>
            </div>

            {/* Inputs Customizados de Data e Filtro por Máquina */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="startDate" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Início
                  </label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setActiveRange('custom');
                      setStartDate(e.target.value);
                    }}
                    className="min-h-[40px] w-36 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="endDate" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fim
                  </label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setActiveRange('custom');
                      setEndDate(e.target.value);
                    }}
                    className="min-h-[40px] w-36 text-xs"
                  />
                </div>
              </div>

              {/* Seletor Opcional de Máquina */}
              <div className="flex flex-col gap-1">
                <label htmlFor="machineFilter" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Sopradora
                </label>
                <select
                  id="machineFilter"
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="min-h-[40px] rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Todas as Sopradoras</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade de Máquinas em Tempo Real */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              Sopradoras no Chão de Fábrica (Tempo Real)
            </h2>
            <span className="text-xs text-muted-foreground">
              {machines.length} {machines.length === 1 ? 'máquina cadastrada' : 'máquinas cadastradas'}
            </span>
          </div>

          {isLoadingMachines ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((idx) => (
                <Skeleton key={idx} className="h-24 w-full" />
              ))}
            </div>
          ) : machines.length === 0 ? (
            <Card className="border-border/60 bg-muted/20">
              <CardContent className="p-6 text-center text-xs text-muted-foreground">
                Nenhuma máquina sopradora cadastrada no momento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {machines.map((machine) => {
                const config = MACHINE_STATUS_CONFIG[machine.status];
                const StatusIcon = config.icon;
                const isSelected = selectedMachineId === machine.id;

                return (
                  <Card
                    key={machine.id}
                    onClick={() => {
                      setSelectedMachineId((prev) => (prev === machine.id ? '' : machine.id));
                    }}
                    className={`cursor-pointer transition-all hover:border-primary/50 touch-manipulation ${
                      isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border/80'
                    }`}
                  >
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                          {machine.code}
                        </span>
                        <Badge
                          variant={config.badgeVariant}
                          className={`text-[10px] font-semibold uppercase border px-2 py-0.5 flex items-center gap-1 ${config.colorClass}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground truncate">
                          {machine.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {machine.model ? machine.model : 'Modelo não informado'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Cards de KPIs Principais */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Indicadores Chave de Desempenho (KPIs)
            </h2>
            <span className="text-xs text-muted-foreground">
              Período: {startDate} até {endDate}
            </span>
          </div>

          {metrics ? (
            <KpiCards metrics={metrics} isLoading={isLoadingMetrics} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((idx) => (
                <Skeleton key={idx} className="h-32 w-full" />
              ))}
            </div>
          )}
        </section>

        {/* Gráfico de Pareto de Paradas de Linha */}
        <section className="space-y-3">
          <ParetoChart
            data={metrics?.pareto ?? []}
            isLoading={isLoadingMetrics}
          />
        </section>
      </div>
    </AppLayout>
  );
}
