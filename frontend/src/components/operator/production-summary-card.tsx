import React from 'react';
import { Package, TrendingUp, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ProductionSummaryCardProps {
  totalQuantity: number;
  entryCount: number;
  pendingBufferQuantity?: number;
  className?: string;
}

export function ProductionSummaryCard({
  totalQuantity,
  entryCount,
  pendingBufferQuantity = 0,
  className,
}: ProductionSummaryCardProps): React.ReactElement {
  const displayTotal = totalQuantity + pendingBufferQuantity;

  return (
    <Card className={cn('border-border bg-card shadow-sm overflow-hidden', className)}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Package className="h-4 w-4 text-primary" />
            <span>Produção Acumulada no Turno</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{entryCount} apontamento(s)</span>
          </div>
        </div>

        <div className="flex flex-baseline items-baseline gap-2">
          <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            {displayTotal.toLocaleString('pt-BR')}
          </span>
          <span className="text-base font-semibold text-muted-foreground">garrafas</span>
        </div>

        {pendingBufferQuantity > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-warning">
            <Layers className="h-3.5 w-3.5" />
            <span>
              Inclui {pendingBufferQuantity.toLocaleString('pt-BR')} garrafa(s) gravada(s) no buffer local offline.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
