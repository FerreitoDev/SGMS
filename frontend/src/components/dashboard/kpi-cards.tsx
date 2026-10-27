import React from 'react';
import { Layers, AlertTriangle, Activity, Zap, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardMetrics } from '@/types/reports';

export interface KpiCardsProps {
  metrics: DashboardMetrics;
  isLoading?: boolean;
}

/**
 * Formata minutos inteiros de parada em string legível (ex: "1h 45min" ou "30 min" ou "0 min")
 */
function formatDowntimeDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hrs === 0) return `${remainingMins} min`;
  if (remainingMins === 0) return `${hrs}h`;
  return `${hrs}h ${remainingMins}min`;
}

export function KpiCards({ metrics, isLoading = false }: KpiCardsProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <Card key={idx} className="border border-border/60 bg-card/60 shadow-xs">
            <CardContent className="p-5 flex items-center justify-center min-h-[128px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const {
    totalBottles,
    totalDowntimeMinutes,
    totalPlannedMinutes,
    availabilityPercentage,
    averagePaceBottlesPerHour,
  } = metrics;

  const downtimeSharePercentage =
    totalPlannedMinutes > 0
      ? ((totalDowntimeMinutes / totalPlannedMinutes) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Volume Produzido */}
      <Card className="border border-border/80 bg-card shadow-xs transition-all hover:border-primary/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Volume Produzido
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-4 w-4" />
            </div>
          </div>

          <div>
            <p className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {totalBottles.toLocaleString('pt-BR')} <span className="text-sm font-semibold text-muted-foreground">un</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Garrafas sopradas no período
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Tempo Parado */}
      <Card className="border border-border/80 bg-card shadow-xs transition-all hover:border-amber-500/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo Parado
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>

          <div>
            <p className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {formatDowntimeDuration(totalDowntimeMinutes)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalDowntimeMinutes > 0
                ? `${downtimeSharePercentage}% do tempo planejado`
                : 'Zero paradas registradas'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Disponibilidade Geral */}
      <Card className="border border-border/80 bg-card shadow-xs transition-all hover:border-emerald-500/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Disponibilidade
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div>
            <p className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {availabilityPercentage.toFixed(1)}%
            </p>
            
            {/* Barra de Progresso Visual de Disponibilidade */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  availabilityPercentage >= 85
                    ? 'bg-emerald-500'
                    : availabilityPercentage >= 70
                      ? 'bg-amber-500'
                      : 'bg-destructive'
                )}
                style={{ width: `${Math.min(100, Math.max(0, availabilityPercentage))}%` }}
              />
            </div>
            
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Tempo líquido / planejado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Ritmo Médio */}
      <Card className="border border-border/80 bg-card shadow-xs transition-all hover:border-violet-500/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ritmo Médio
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          <div>
            <p className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {Math.round(averagePaceBottlesPerHour).toLocaleString('pt-BR')}{' '}
              <span className="text-sm font-semibold text-muted-foreground">un/h</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ritmo em operação ativa
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
