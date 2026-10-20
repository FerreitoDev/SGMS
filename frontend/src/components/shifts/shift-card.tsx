import React from 'react';
import { Clock, Check } from 'lucide-react';
import { Shift } from '@/types/domain';
import { calculateShiftDuration } from '@/schemas/shift-schema';
import { cn } from '@/lib/utils';

export interface ShiftCardProps {
  shift: Shift;
  isSelected?: boolean;
  onSelect?: (shift: Shift) => void;
  className?: string;
}

export function ShiftCard({
  shift,
  isSelected = false,
  onSelect,
  className,
}: ShiftCardProps): React.ReactElement {
  const isAvailable = shift.isActive;

  const handleClick = () => {
    if (isAvailable && onSelect) {
      onSelect(shift);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isAvailable && onSelect) {
      e.preventDefault();
      onSelect(shift);
    }
  };

  const duration = calculateShiftDuration(shift.startTime, shift.endTime);

  return (
    <div
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-pressed={isSelected}
      aria-disabled={!isAvailable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex min-h-[72px] w-full items-center justify-between rounded-xl border p-3.5 transition-all duration-150 touch-manipulation select-none',
        // Estados de interação / disponibilidade
        isAvailable
          ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm active:scale-[0.99]'
          : 'cursor-not-allowed opacity-50 bg-muted/40',
        // Feedback visual de seleção ativa
        isSelected
          ? 'border-2 border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
          : 'border-border bg-card',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : isAvailable
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
          )}
        >
          <Clock className="h-5 w-5" />
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">
            {shift.name}
          </span>
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {shift.startTime} – {shift.endTime}
            <span className="ml-1.5 font-normal text-muted-foreground/80">
              ({duration})
            </span>
          </span>
        </div>
      </div>

      {isSelected && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </div>
      )}
    </div>
  );
}

export default ShiftCard;
