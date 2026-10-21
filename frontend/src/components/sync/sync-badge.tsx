import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { cn } from '@/lib/utils';

export interface SyncBadgeProps {
  className?: string;
  showButtonWhenPending?: boolean;
}

export function SyncBadge({
  className,
  showButtonWhenPending = true,
}: SyncBadgeProps): React.ReactElement {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();

  if (isSyncing) {
    return (
      <Badge
        variant="info"
        className={cn(
          'flex min-h-[32px] items-center gap-1.5 px-3 py-1 font-medium transition-all',
          className,
        )}
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Sincronizando...</span>
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge
        variant="destructive"
        className={cn(
          'flex min-h-[32px] items-center gap-1.5 px-3 py-1 font-medium shadow-sm transition-all',
          className,
        )}
      >
        <WifiOff className="h-3.5 w-3.5" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
            {pendingCount}
          </span>
        )}
      </Badge>
    );
  }

  if (pendingCount > 0) {
    if (showButtonWhenPending) {
      return (
        <button
          type="button"
          onClick={() => void syncNow()}
          className={cn(
            'flex min-h-[44px] items-center gap-2 rounded-full border border-warning/40 bg-warning/15 px-3.5 py-1.5 text-xs font-semibold text-warning-foreground transition-all hover:bg-warning/25 active:scale-95 touch-manipulation',
            className,
          )}
          title="Clique para forçar a sincronização de eventos pendentes"
        >
          <RefreshCw className="h-3.5 w-3.5 text-warning" />
          <span>{pendingCount} pendente(s)</span>
          <span className="rounded bg-warning/30 px-1.5 py-0.5 text-[10px] uppercase font-bold text-warning">
            Sincronizar
          </span>
        </button>
      );
    }

    return (
      <Badge
        variant="warning"
        className={cn('flex min-h-[32px] items-center gap-1.5 px-3 py-1 font-medium', className)}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>{pendingCount} pendente(s)</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="success"
      className={cn(
        'flex min-h-[32px] items-center gap-1.5 px-3 py-1 font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 transition-all',
        className,
      )}
    >
      <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      <span>Online</span>
    </Badge>
  );
}
