import React, { useState, useEffect } from 'react';
import { Package, Plus, Clock, Loader2 } from 'lucide-react';
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
import { productionsService } from '@/services/productions-service';
import { ProblemDetailsError, extractProblemDetail } from '@/lib/api-client';
import { productionSchema } from '@/schemas/production-schema';

export interface ProductionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocationId: string;
  onSuccess?: () => void | Promise<void>;
}

export function ProductionDrawer({
  open,
  onOpenChange,
  allocationId,
  onSuccess,
}: ProductionDrawerProps): React.ReactElement {
  const [rawQuantity, setRawQuantity] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setRawQuantity('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async (e?: React.FormEvent): Promise<void> => {
    if (e) {
      e.preventDefault();
    }

    const parsed = productionSchema.safeParse({ quantity: rawQuantity });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const msg = firstIssue ? firstIssue.message : 'Informe uma quantidade maior que zero.';
      setErrorMessage(msg);
      return;
    }

    const quantity = parsed.data.quantity;
    setErrorMessage(null);
    setIsSubmitting(true);

    const clientUuid = OfflineStorage.generateUuid();
    const nowIso = new Date().toISOString();

    try {
      // 1. Tenta salvar no buffer local do IndexedDB (resiliente se o IndexedDB estiver bloqueado)
      try {
        await OfflineStorage.saveEvent({
          clientUuid,
          type: 'PRODUCTION',
          endpoint: '/productions',
          payload: {
            allocationId,
            quantity,
            timestamp: nowIso,
          },
          createdAt: nowIso,
          status: 'PENDING',
        });
      } catch (storageErr) {
        console.warn('[ProductionDrawer] Aviso ao gravar no IndexedDB:', storageErr);
      }

      // 2. Envia imediatamente via API
      try {
        await productionsService.create({
          clientUuid,
          allocationId,
          quantity,
          timestamp: nowIso,
        });

        try {
          await OfflineStorage.markAsSynced([clientUuid]);
        } catch {
          // Ignora falha secundária de marcação no IndexedDB
        }

        notifyStorageUpdated();
        await onSuccess?.();
        onOpenChange(false);
        toast.success(`${quantity.toLocaleString('pt-BR')} garrafas registradas com sucesso.`);
      } catch (err: unknown) {
        // Se o servidor respondeu com erro de negócio (HTTP 4xx/5xx), remove do buffer local e exibe a falha real
        if (err instanceof ProblemDetailsError && err.status > 0) {
          try {
            await OfflineStorage.deleteEvent(clientUuid);
          } catch {
            // Ignora
          }
          notifyStorageUpdated();
          const detail = extractProblemDetail(err);
          setErrorMessage(detail);
          toast.error('Não foi possível registrar o apontamento', {
            description: detail,
          });
          return;
        }

        // Falha real de conectividade de rede (status === 0): mantém no IndexedDB e fecha a gaveta
        notifyStorageUpdated();
        await onSuccess?.();
        onOpenChange(false);
        toast.info(
          `${quantity.toLocaleString('pt-BR')} garrafas salvas localmente no dispositivo. Serão enviadas ao restabelecer a rede.`,
          { duration: 4000 },
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-xl rounded-t-3xl border-t border-border bg-card p-6 shadow-2xl"
      >
        <SheetHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Package className="h-5 w-5" />
            <SheetTitle className="text-lg font-black tracking-tight">
              Apontar Produção de Garrafas
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Informe o volume produzido para a sopradora ativa neste lote.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={(e) => void handleConfirm(e)} noValidate className="mt-5 space-y-5">
          {/* Input Principal de Quantidade de Grande Dimensão (Sem Spinners e Sem Atalhos) */}
          <div className="space-y-2">
            <label
              htmlFor="production-quantity-input"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Quantidade de Garrafas
            </label>
            <div className="relative">
              <Input
                id="production-quantity-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                autoFocus
                autoComplete="off"
                value={rawQuantity}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, '');
                  setRawQuantity(onlyDigits);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                onWheel={(e) => e.currentTarget.blur()}
                disabled={isSubmitting}
                className="h-20 text-center font-mono text-4xl sm:text-5xl font-black tracking-wider text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-primary shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {errorMessage && (
              <p className="text-center text-xs font-semibold text-destructive">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Horário do Apontamento Travado no Instante Atual (RN-09) */}
          <div className="pt-1 border-t border-border/50">
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">Horário do Lançamento: Imediato (Agora)</p>
                <p className="text-muted-foreground text-[11px]">
                  O horário do apontamento é fixado automaticamente no instante da confirmação.
                </p>
              </div>
            </div>
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
              disabled={isSubmitting}
              className="min-h-[48px] w-full sm:w-2/3 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base touch-manipulation shadow-md flex items-center justify-center gap-2 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gravando...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 stroke-[3]" />
                  Confirmar Apontamento
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
