import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  Clock,
  AlertTriangle,
  Plus,
  Loader2,
  History,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useCurrentAllocation } from '@/hooks/use-current-allocation';
import { allocationsService } from '@/services/allocations-service';
import { productionsService } from '@/services/productions-service';
import { downtimesService } from '@/services/downtimes-service';
import { OfflineStorage } from '@/lib/offline-storage';
import { STORAGE_UPDATED_EVENT } from '@/hooks/use-offline-sync';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OperatorHeader } from '@/components/operator/operator-header';
import { ProductionSummaryCard } from '@/components/operator/production-summary-card';
import { ProductionDrawer } from '@/components/production/production-drawer';
import { DowntimeModal } from '@/components/downtime/downtime-modal';
import type { ProductionEntry, DowntimeRecord } from '@/types/domain';
import type { ProductionPayload } from '@/types/offline';

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function OperatorConsolePage(): React.ReactElement {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { allocation, isLoading: isCheckingAllocation, refetch: refetchAllocation } = useCurrentAllocation();

  const [productions, setProductions] = useState<ProductionEntry[]>([]);
  const [downtimes, setDowntimes] = useState<DowntimeRecord[]>([]);
  const [pendingProductionsQty, setPendingProductionsQty] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);
  const [isResolvingDowntime, setIsResolvingDowntime] = useState<boolean>(false);
  const [isProductionDrawerOpen, setIsProductionDrawerOpen] = useState<boolean>(false);
  const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState<boolean>(false);
  const [isDowntimeRetroactive, setIsDowntimeRetroactive] = useState<boolean>(false);

  // Tempo decorrido de parada ativa
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);

  // Parada ativa com status IN_PROGRESS
  const activeDowntime = useMemo(() => {
    return downtimes.find((d) => d.status === 'IN_PROGRESS') ?? null;
  }, [downtimes]);

  // Carregamento de dados de produção, paradas e buffer offline
  const loadConsoleData = useCallback(async () => {
    if (!allocation) return;

    try {
      const [remoteProductions, remoteDowntimes, offlineEvents] = await Promise.all([
        productionsService.listByAllocation(allocation.id).catch(() => []),
        downtimesService.listByAllocation(allocation.id).catch(() => []),
        OfflineStorage.getPendingEvents().catch(() => []),
      ]);

      setProductions(remoteProductions);
      setDowntimes(remoteDowntimes);

      // Quantidade pendente no buffer local pertencente a esta alocação
      const offlineQty = offlineEvents
        .filter((e) => e.type === 'PRODUCTION' && (e.payload as ProductionPayload).allocationId === allocation.id)
        .reduce((acc, curr) => acc + (curr.payload as ProductionPayload).quantity, 0);

      setPendingProductionsQty(offlineQty);
    } catch (err) {
      console.warn('[OperatorConsole] Erro ao carregar dados operacionais:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [allocation]);

  useEffect(() => {
    if (allocation) {
      void loadConsoleData();
    }
  }, [allocation, loadConsoleData]);

  // Atualização em resposta a eventos de storage local e gavetas
  useEffect(() => {
    const handleStorageUpdate = (): void => {
      void loadConsoleData();
    };
    const handleOpenProduction = (): void => {
      setIsProductionDrawerOpen(true);
    };
    const handleOpenDowntime = (e: Event): void => {
      const customEvent = e as CustomEvent<{ isRetroactive?: boolean }>;
      setIsDowntimeRetroactive(Boolean(customEvent.detail?.isRetroactive));
      setIsDowntimeModalOpen(true);
    };

    window.addEventListener(STORAGE_UPDATED_EVENT, handleStorageUpdate);
    window.addEventListener('sgms:open-production-drawer', handleOpenProduction);
    window.addEventListener('sgms:open-downtime-modal', handleOpenDowntime);

    return () => {
      window.removeEventListener(STORAGE_UPDATED_EVENT, handleStorageUpdate);
      window.removeEventListener('sgms:open-production-drawer', handleOpenProduction);
      window.removeEventListener('sgms:open-downtime-modal', handleOpenDowntime);
    };
  }, [loadConsoleData]);

  // Cronômetro da parada ativa
  useEffect(() => {
    if (!activeDowntime) {
      setStopwatchSeconds(0);
      return;
    }

    const startMs = new Date(activeDowntime.startTime).getTime();

    const updateTimer = (): void => {
      const nowMs = Date.now();
      const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setStopwatchSeconds(elapsed);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [activeDowntime]);

  // Liberação da máquina
  const handleReleaseMachine = async (): Promise<void> => {
    if (!allocation) return;
    try {
      setIsReleasing(true);
      await allocationsService.release(allocation.id);
      await refetchAllocation();
      toast.success(`Máquina ${allocation.machine?.code} desocupada com sucesso.`);
      navigate('/chao-de-fabrica/alocacao', { replace: true });
    } catch {
      toast.error('Não foi possível liberar a máquina. Tente novamente.');
    } finally {
      setIsReleasing(false);
    }
  };

  // Resolução rápida da parada ativa (Retomar Produção)
  const handleResolveDowntime = async (): Promise<void> => {
    if (!activeDowntime) return;
    try {
      setIsResolvingDowntime(true);
      const resolvedAt = new Date().toISOString();

      try {
        await downtimesService.resolve(activeDowntime.id, { endTime: resolvedAt });
      } catch {
        // Se offline, grava no buffer local de eventos
        await OfflineStorage.saveEvent({
          clientUuid: OfflineStorage.generateUuid(),
          type: 'DOWNTIME',
          endpoint: `/downtimes/${activeDowntime.id}/resolve`,
          payload: { endTime: resolvedAt, allocationId: activeDowntime.allocationId },
          createdAt: resolvedAt,
          status: 'PENDING',
        });
      }

      toast.success('Parada encerrada. Máquina em operação.');
      void loadConsoleData();
    } catch {
      toast.error('Erro ao encerrar parada.');
    } finally {
      setIsResolvingDowntime(false);
    }
  };

  // Se não houver alocação ativa após checagem, conduz para seleção
  if (!isCheckingAllocation && !allocation) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Cpu className="mb-4 h-12 w-12 text-muted-foreground/60" />
        <h2 className="text-lg font-bold text-foreground">Nenhuma máquina alocada</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Você não possui uma sessão operacional ativa. Selecione uma sopradora para iniciar os trabalhos.
        </p>
        <Button
          type="button"
          onClick={() => navigate('/chao-de-fabrica/alocacao')}
          className="mt-5 min-h-[44px] font-bold touch-manipulation"
        >
          Assumir Sopradora
        </Button>
      </div>
    );
  }

  if (isCheckingAllocation || !allocation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span>Carregando console operacional...</span>
        </div>
      </div>
    );
  }

  const totalQuantity = productions.reduce((acc, p) => acc + p.quantity, 0);
  const entryCount = productions.length;
  const isMachineStopped = Boolean(activeDowntime);

  return (
    <div className="min-h-screen bg-background pb-12 flex flex-col">
      {/* Topo Operacional */}
      <OperatorHeader
        allocation={allocation}
        userName={user?.name ?? ''}
        onReleaseMachine={handleReleaseMachine}
        onLogout={logout}
        isReleasing={isReleasing}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 space-y-5">
        {/* Card de Status da Máquina */}
        <Card
          className={`border transition-all overflow-hidden ${
            isMachineStopped
              ? 'border-destructive/40 bg-destructive/10 shadow-sm'
              : 'border-emerald-500/30 bg-emerald-500/10 shadow-xs'
          }`}
        >
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  isMachineStopped
                    ? 'bg-destructive/20 text-destructive border border-destructive/30 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isMachineStopped ? (
                  <Square className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 fill-current" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isMachineStopped ? 'destructive' : 'success'}
                    className="font-bold uppercase tracking-wider text-xs"
                  >
                    {isMachineStopped ? 'Máquina Parada' : 'Em Operação'}
                  </Badge>
                  {!isMachineStopped && (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>

                {isMachineStopped && activeDowntime ? (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-sm font-bold text-foreground">
                      Motivo: <span className="font-mono text-destructive">{activeDowntime.reason}</span>
                    </p>
                    <div className="flex items-center gap-1.5 font-mono text-xl sm:text-2xl font-black text-destructive">
                      <Clock className="h-5 w-5" />
                      <span>{formatDuration(stopwatchSeconds)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    Linha em ritmo normal de sopro.
                  </p>
                )}
              </div>
            </div>

            {/* Ação rápida de Retomada se parada ativa */}
            {isMachineStopped && (
              <Button
                type="button"
                onClick={() => void handleResolveDowntime()}
                disabled={isResolvingDowntime}
                className="min-h-[52px] w-full sm:w-auto px-6 font-black text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-98 touch-manipulation gap-2"
              >
                {isResolvingDowntime ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Retomando...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 fill-current" />
                    Retomar Produção
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card de Resumo de Produção */}
        <ProductionSummaryCard
          totalQuantity={totalQuantity}
          entryCount={entryCount}
          pendingBufferQuantity={pendingProductionsQty}
        />

        {/* Painel de Ações Táteis Primárias de Chão de Fábrica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Botão de Apontar Produção */}
          <Button
            type="button"
            id="btn-open-production-drawer"
            disabled={isMachineStopped}
            className="min-h-[58px] text-lg font-black tracking-wide w-full shadow-md bg-primary hover:bg-primary/90 text-primary-foreground touch-manipulation flex items-center justify-center gap-2 active:scale-98"
            onClick={() => setIsProductionDrawerOpen(true)}
          >
            <Plus className="h-6 w-6 stroke-[3]" />
            <span>+ Apontar Produção</span>
          </Button>

          {/* Botão de Parar Máquina */}
          {!isMachineStopped && (
            <Button
              type="button"
              id="btn-open-downtime-modal"
              variant="destructive"
              className="min-h-[58px] text-base font-bold w-full shadow-md touch-manipulation flex items-center justify-center gap-2 active:scale-98"
              onClick={() => {
                setIsDowntimeRetroactive(false);
                setIsDowntimeModalOpen(true);
              }}
            >
              <AlertTriangle className="h-5 w-5" />
              <span>Registrar Parada de Linha</span>
            </Button>
          )}

          {/* Ação secundária: Parada Retroativa */}
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] text-xs font-semibold w-full sm:col-span-2 border-dashed text-muted-foreground hover:text-foreground touch-manipulation flex items-center justify-center gap-1.5"
            onClick={() => {
              setIsDowntimeRetroactive(true);
              setIsDowntimeModalOpen(true);
            }}
          >
            <History className="h-4 w-4" />
            <span>Lançar Parada Ocorrida Anteriormente (Retroativa)</span>
          </Button>
        </div>

        {/* Histórico Recente do Turno */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border/50 pb-2">
            <span>ÚLTIMOS LANÇAMENTOS DO TURNO</span>
            {isLoadingData && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          </div>

          {productions.length === 0 && pendingProductionsQty === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhum apontamento registrado neste turno ainda.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {productions.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-bold text-foreground">
                      +{prod.quantity.toLocaleString('pt-BR')} garrafas
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(prod.recordedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Gaveta de Apontamento de Produção (Tarefa 3.5) */}
      {allocation && (
        <ProductionDrawer
          open={isProductionDrawerOpen}
          onOpenChange={setIsProductionDrawerOpen}
          allocationId={allocation.id}
          onSuccess={loadConsoleData}
        />
      )}

      {/* Modal/Gaveta de Paradas em Tempo Real e Retroativas (Tarefa 3.6) */}
      {allocation && (
        <DowntimeModal
          open={isDowntimeModalOpen}
          onOpenChange={setIsDowntimeModalOpen}
          allocationId={allocation.id}
          initialIsRetroactive={isDowntimeRetroactive}
          onSuccess={loadConsoleData}
        />
      )}
    </div>
  );
}
