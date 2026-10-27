import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import type { ParetoItem } from '@/types/reports';

export interface ParetoChartProps {
  data: ParetoItem[];
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ParetoItem;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-popover/95 p-3.5 shadow-lg backdrop-blur-xs text-xs space-y-1.5 min-w-[200px]">
      <div className="font-bold text-foreground border-b border-border/60 pb-1.5 flex items-center justify-between">
        <span>{item.reasonLabel}</span>
        <span className="font-mono text-muted-foreground text-[10px]">
          {item.occurrences} {item.occurrences === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Tempo Parado:</span>
          <span className="font-mono font-bold text-primary">
            {item.totalMinutes} min
          </span>
        </div>

        <div className="flex justify-between items-center text-muted-foreground">
          <span>Impacto Individual:</span>
          <span className="font-mono font-medium text-foreground">
            {item.percentage.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/40">
          <span className="font-semibold text-foreground">Impacto Acumulado:</span>
          <span className="font-mono font-black text-destructive">
            {item.cumulativePercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function ParetoChart({ data, isLoading = false }: ParetoChartProps): React.ReactElement {
  return (
    <Card className="border border-border/80 bg-card shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Análise de Gargalos — Gráfico de Pareto (80/20)</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Classificação das causas de parada por impacto acumulado em minutos
            </CardDescription>
          </div>

          {data.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md self-start sm:self-auto">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <span>Linha vermelha tracejada marca o limiar de 80% das perdas</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-[360px] flex items-center justify-center text-muted-foreground text-xs">
            <span>Carregando gráfico de Pareto...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 space-y-2.5 rounded-xl border border-dashed border-border/70 bg-muted/20 my-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Nenhuma parada registrada no período</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                A linha de sopro operou continuamente sem interrupções registradas no intervalo selecionado.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-[360px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 20, bottom: 25, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />

                <XAxis
                  dataKey="reasonLabel"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />

                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#3b82f6"
                  tick={{ fontSize: 11 }}
                  unit="m"
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  unit="%"
                  stroke="#ef4444"
                  tick={{ fontSize: 11 }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                />

                {/* Linha de Referência 80/20 do Princípio de Pareto */}
                <ReferenceLine
                  yAxisId="right"
                  y={80}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Limiar 80%',
                    fill: '#dc2626',
                    position: 'insideTopLeft',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* Barra de Minutos Totais (Eixo Esquerdo) */}
                <Bar
                  yAxisId="left"
                  dataKey="totalMinutes"
                  name="Tempo Parado (min)"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />

                {/* Linha Percentual Acumulada (Eixo Direito) */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePercentage"
                  name="% Acumulado"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
