import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { OfflineStorage } from '@/lib/offline-storage';
import { syncService, type SyncEventItemPayload } from '@/services/sync-service';

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<number>;
}

export const STORAGE_UPDATED_EVENT = 'sgms:storage-updated';

/**
 * Notifica os hooks ativos de que novos dados foram inseridos ou alterados no IndexedDB
 */
export function notifyStorageUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_UPDATED_EVENT));
  }
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const isSyncingRef = useRef<boolean>(false);

  const refreshPendingCount = useCallback(async (): Promise<number> => {
    try {
      const count = await OfflineStorage.countPending();
      setPendingCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    // Evita execuções concorrentes ou tentativa quando o dispositivo está explicitamente offline
    if (isSyncingRef.current || !navigator.onLine) {
      return;
    }

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const pendingEvents = await OfflineStorage.getPendingEvents();
      if (pendingEvents.length === 0) {
        setPendingCount(0);
        return;
      }

      const payloadEvents: SyncEventItemPayload[] = pendingEvents.map((event) => ({
        clientUuid: event.clientUuid,
        type: event.type,
        payload: event.payload,
      }));

      const result = await syncService.processBatch(payloadEvents);

      // Marca tanto os processados quanto os ignorados (já existiam no backend) como sincronizados
      const syncedUuids = [...result.processedClientUuids, ...result.ignoredClientUuids];
      if (syncedUuids.length > 0) {
        await OfflineStorage.markAsSynced(syncedUuids);
      }

      const updatedCount = await OfflineStorage.countPending();
      setPendingCount(updatedCount);
      setLastSyncAt(new Date());

      if (result.processedCount > 0) {
        toast.success(
          result.processedCount === 1
            ? '1 apontamento sincronizado com sucesso.'
            : `${result.processedCount} apontamentos sincronizados com sucesso.`,
        );
      }

      notifyStorageUpdated();
    } catch (err) {
      // Falha transitória de rede não remove os registros do IndexedDB
      console.warn('[OfflineSync] Falha na sincronização em lote. Fila local preservada:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Carrega contagem inicial
    void refreshPendingCount();

    const handleOnline = (): void => {
      setIsOnline(true);
      void syncNow();
    };

    const handleOffline = (): void => {
      setIsOnline(false);
    };

    const handleStorageUpdate = (): void => {
      void refreshPendingCount().then((count) => {
        if (count > 0 && navigator.onLine) {
          void syncNow();
        }
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(STORAGE_UPDATED_EVENT, handleStorageUpdate);

    // Verificação periódica suave a cada 30 segundos
    const intervalId = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        void OfflineStorage.countPending().then((count) => {
          setPendingCount(count);
          if (count > 0) {
            void syncNow();
          }
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(STORAGE_UPDATED_EVENT, handleStorageUpdate);
      clearInterval(intervalId);
    };
  }, [refreshPendingCount, syncNow]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    syncNow,
    refreshPendingCount,
  };
}
