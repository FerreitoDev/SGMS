import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Clock,
  History,
  CheckCircle2,
  Loader2,
  FileText,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OfflineStorage } from '@/lib/offline-storage';
import { notifyStorageUpdated } from '@/hooks/use-offline-sync';
import { downtimesService } from '@/services/downtimes-service';
import { ProblemDetailsError, extractProblemDetail } from '@/lib/api-client';
import {
  downtimeSchema,
  DOWNTIME_REASONS,
  DOWNTIME_LABELS,
  type DowntimeFormData,
} from '@/schemas/downtime-schema';
import type { DowntimeReason } from '@/types/domain';

export interface DowntimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocationId: string;
  initialIsRetroactive?: boolean;
  onSuccess?: () => void;
}

function getCurrentLocalDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function DowntimeModal({
  open,
  onOpenChange,
  allocationId,
  initialIsRetroactive = false,
  onSuccess,
}: DowntimeModalProps): React.ReactElement {
  const [isRetroactive, setIsRetroactive] = useState<boolean>(initialIsRetroactive);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DowntimeFormData>({
    resolver: zodResolver(downtimeSchema),
    defaultValues: {
      reason: undefined,
      justification: '',
      startTime: getCurrentLocalDateTime(),
      endTime: getCurrentLocalDateTime(),
      isRetroactive: initialIsRetroactive,
    },
  });

  const selectedReason = watch('reason');

  useEffect(() => {
    if (open) {
      setIsRetroactive(initialIsRetroactive);
      reset({
        reason: undefined,
        justification: '',
        startTime: getCurrentLocalDateTime(),
        endTime: getCurrentLocalDateTime(),
        isRetroactive: initialIsRetroactive,
      });
    }
  }, [open, initialIsRetroactive, reset]);

  const handleToggleMode = (retroactive: boolean): void => {
    setIsRetroactive(retroactive);
    setValue('isRetroactive', retroactive, { shouldValidate: true });
    setValue('startTime', getCurrentLocalDateTime(), { shouldValidate: true });
    if (retroactive) {
      setValue('endTime', getCurrentLocalDateTime(), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: DowntimeFormData): Promise<void> => {
    const clientUuid = OfflineStorage.generateUuid();
    const nowIso = new Date().toISOString();
    const startTimeIso = data.isRetroactive ? new Date(data.startTime).toISOString() : nowIso;
    const endTimeIso = data.isRetroactive && data.endTime ? new Date(data.endTime).toISOString() : null;
    const justification = data.reason === 'OUTROS' && data.justification ? data.justification.trim() : null;

    if (data.isRetroactive && endTimeIso) {
      // 1. Grava parada retroativa no IndexedDB
      try {
        await OfflineStorage.saveEvent({
          clientUuid,
          type: 'DOWNTIME',
          endpoint: '/downtimes/retroactive',
          payload: {
            allocationId,
            reason: data.reason,
            justification,
            startTime: startTimeIso,
            endTime: endTimeIso,
            status: 'RESOLVED',
          },
          createdAt: nowIso,
          status: 'PENDING',
        });
      } catch (storageErr) {
        console.warn('[DowntimeModal] Aviso ao gravar no IndexedDB:', storageErr);
      }

      // 2. Tenta envio HTTP imediato
      try {
        await downtimesService.createRetroactive({
          clientUuid,
          allocationId,
          reason: data.reason,
          justification,
          startTime: startTimeIso,
          endTime: endTimeIso,
        });

        try {
          await OfflineStorage.markAsSynced([clientUuid]);
        } catch {
          // Ignora
        }
        notifyStorageUpdated();
        await onSuccess?.();
        onOpenChange(false);
        toast.success('Parada retroativa registrada com sucesso.');
      } catch (err: unknown) {
        if (err instanceof ProblemDetailsError && err.status > 0) {
          try {
            await OfflineStorage.deleteEvent(clientUuid);
          } catch {
            // Ignora
          }
          notifyStorageUpdated();
          toast.error('Não foi possível registrar a parada retroativa', {
            description: extractProblemDetail(err),
          });
          return;
        }
        notifyStorageUpdated();
        await onSuccess?.();
        onOpenChange(false);
        toast.info('Parada retroativa salva no dispositivo. Será enviada na reconexão.');
      }
    } else {
      // 1. Grava início de parada em tempo real no IndexedDB
      try {
        await OfflineStorage.saveEvent({
          clientUuid,
          type: 'DOWNTIME',
          endpoint: '/downtimes/start',
          payload: {
            allocationId,
            reason: data.reason,
            justification,
            startTime: startTimeIso,
            status: 'IN_PROGRESS',
          },
          createdAt: nowIso,
          status: 'PENDING',
        });
      } catch (storageErr) {
        console.warn('[DowntimeModal] Aviso ao gravar no IndexedDB:', storageErr);
      }

      // 2. Tenta envio HTTP imediato
      try {
        await downtimesService.start({
          clientUuid,
          allocationId,
          reason: data.reason,
          justification,
          startTime: startTimeIso,
        });

        try {
          await OfflineStorage.markAsSynced([clientUuid]);
        } catch {
          // Ignora
        }
        notifyStorageUpdated();
        await onSuccess?.();
        onOpenChange(false);
        toast.error(`Máquina paralisada: ${DOWNTIME_LABELS[data.reason]}.`);
      } catch (err: unknown) {
        if (err instanceof ProblemDetailsError && err.status > 0) {
          try {
            await OfflineStorage.deleteEvent(clientUuid);
          } catch {
            // Ignora
          }
          notifyStorageUpdated();
          toast.error('Não foi possível registrar a parada', {
            description: extractProblemDetail(err),
          });
          return;
        }
        notifyStorageUpdated();
        await onSuccess?.();
        onOpenChange(false);
        toast.info('Parada registrada localmente no dispositivo (Modo Offline).');
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-6 shadow-2xl"
      >
        <SheetHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-destructive font-bold">
            <AlertTriangle className="h-5 w-5" />
            <SheetTitle className="text-lg font-black tracking-tight text-foreground">
              {isRetroactive ? 'Registrar Parada Retroativa' : 'Registrar Parada de Linha'}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {isRetroactive
              ? 'Informe o intervalo de tempo e o motivo da interrupção já concluída.'
              : 'Selecione o motivo para suspender a máquina imediatamente.'}
          </SheetDescription>
        </SheetHeader>

        {/* Alternador de Modo (Tempo Real vs Retroativo) */}
        <div className="mt-4 flex rounded-lg bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`flex-1 min-h-[38px] rounded-md text-xs font-bold transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
              !isRetroactive
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Tempo Real (Agora)</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode(true)}
            className={`flex-1 min-h-[38px] rounded-md text-xs font-bold transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
              isRetroactive
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Lançamento Retroativo</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
          {/* Seletor de Motivos de Parada em Grade Touch */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Motivo da Interrupção
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOWNTIME_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setValue('reason', reason as DowntimeReason, { shouldValidate: true })}
                    className={`flex min-h-[50px] flex-col items-center justify-center rounded-xl border p-2.5 text-center text-xs font-semibold transition-all touch-manipulation ${
                      isSelected
                        ? 'border-destructive bg-destructive/15 text-destructive ring-2 ring-destructive/30'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span>{DOWNTIME_LABELS[reason]}</span>
                  </button>
                );
              })}
            </div>
            {errors.reason && (
              <p className="text-xs font-semibold text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Campo de Justificativa Textual: Obrigatório para OUTROS */}
          {selectedReason === 'OUTROS' && (
            <div className="space-y-1.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 animate-in fade-in">
              <label
                htmlFor="downtime-justification"
                className="flex items-center gap-1.5 text-xs font-bold text-destructive"
              >
                <FileText className="h-4 w-4" />
                <span>Justificativa Obrigatória (mínimo de 5 caracteres)</span>
              </label>
              <textarea
                id="downtime-justification"
                rows={3}
                placeholder="Descreva detalhadamente o motivo que ocasionou a interrupção..."
                autoFocus
                {...register('justification')}
                className="w-full rounded-md border border-input bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              />
              {errors.justification && (
                <p className="text-xs font-semibold text-destructive">
                  {errors.justification.message}
                </p>
              )}
            </div>
          )}

          {/* Intervalos de Horários */}
          <div className="pt-1 border-t border-border/50">
            {!isRetroactive ? (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">Início da Parada: Imediato (Agora)</p>
                  <p className="text-muted-foreground text-[11px]">
                    O horário de início será travado no instante exato da confirmação.
                  </p>
                </div>
                <input type="hidden" {...register('startTime')} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="downtime-start-time"
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Início da Parada</span>
                  </label>
                  <Input
                    id="downtime-start-time"
                    type="datetime-local"
                    {...register('startTime')}
                    className="min-h-[44px] font-mono text-sm touch-manipulation"
                  />
                  {errors.startTime && (
                    <p className="text-xs font-semibold text-destructive">{errors.startTime.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="downtime-end-time"
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Término da Parada</span>
                  </label>
                  <Input
                    id="downtime-end-time"
                    type="datetime-local"
                    {...register('endTime')}
                    className="min-h-[44px] font-mono text-sm touch-manipulation"
                  />
                  {errors.endTime && (
                    <p className="text-xs font-semibold text-destructive">{errors.endTime.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="pt-2 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="min-h-[48px] w-full sm:w-1/3 touch-manipulation font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedReason}
              variant="destructive"
              className="min-h-[48px] w-full sm:w-2/3 font-black text-base touch-manipulation shadow-md flex items-center justify-center gap-2 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gravando...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  {isRetroactive ? 'Registrar Parada Retroativa' : 'Confirmar Parada Imediata'}
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
