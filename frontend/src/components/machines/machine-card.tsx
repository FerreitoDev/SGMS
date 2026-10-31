import React from 'react';
import { Cpu, Check, AlertTriangle, Ban } from 'lucide-react';
import { Machine } from '@/types/domain';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MachineCardProps {
  machine: Machine;
  isSelected?: boolean;
  onSelect?: (machine: Machine) => void;
  className?: string;
}

export function MachineCard({
  machine,
  isSelected = false,
  onSelect,
  className,
}: MachineCardProps): React.ReactElement {
  const isAvailable = machine.isActive && machine.status === 'IDLE';

  const isRunning = machine.status === 'RUNNING';
  const isInactive = !machine.isActive || machine.status === 'INACTIVE';

  const handleClick = () => {
    if (isAvailable && onSelect) {
      onSelect(machine);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isAvailable && onSelect) {
      e.preventDefault();
      onSelect(machine);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-pressed={isSelected}
      aria-disabled={!isAvailable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex min-h-[88px] w-full flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 touch-manipulation select-none',
        // Estados de interação / disponibilidade
        isAvailable
          ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm active:scale-[0.99]'
          : 'cursor-not-allowed opacity-60 bg-muted/40',
        // Feedback visual de seleção ativa
        isSelected
          ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
          : 'border-border bg-card',
        className
      )}
    >
      {/* Topo do Card: Código e Badge de Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : isAvailable
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-base font-bold tracking-tight text-foreground sm:text-lg">
              {machine.code}
            </span>
            <p className="text-xs font-medium text-foreground line-clamp-1">
              {machine.name}
            </p>
          </div>
        </div>

        {/* Badge do Status Atual */}
        <div className="shrink-0">
          {isRunning ? (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold"
            >
              <AlertTriangle className="h-3 w-3" />
              Em Uso
            </Badge>
          ) : isInactive ? (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-400 font-semibold"
            >
              <Ban className="h-3 w-3" />
              Inativa
            </Badge>
          ) : machine.status === 'STOPPED' ? (
            <Badge
              variant="warning"
              className="flex items-center gap-1 border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold"
            >
              <AlertTriangle className="h-3 w-3" />
              Parada (Em Uso)
            </Badge>
          ) : (
            <Badge
              variant="success"
              className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold"
            >
              Disponível
            </Badge>
          )}
        </div>
      </div>

      {/* Rodapé do Card: Modelo e Indicador de Seleção */}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
        <span className="truncate">
          {machine.model ? `Modelo: ${machine.model}` : 'Modelo não informado'}
        </span>

        {isSelected && (
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            Selecionada
          </span>
        )}
      </div>
    </div>
  );
}

export default MachineCard;
