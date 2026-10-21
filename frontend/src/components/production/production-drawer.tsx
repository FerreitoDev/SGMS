import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Plus, Clock, Loader2, Sparkles } from 'lucide-react';
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
import { productionSchema, type ProductionFormData } from '@/schemas/production-schema';

export interface ProductionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocationId: string;
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

export function ProductionDrawer({
  open,
  onOpenChange,
  allocationId,
  onSuccess,
}: ProductionDrawerProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductionFormData>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      quantity: undefined as unknown as number,
      recordedAt: getCurrentLocalDateTime(),
    },
  });

  const currentQuantity = watch('quantity');

  useEffect(() => {
    if (open) {
      reset({
        quantity: undefined as unknown as number,
        recordedAt: getCurrentLocalDateTime(),
      });
    }
  }, [open, reset]);

  const handleIncrement = (amount: number): void => {
    const current = Number(currentQuantity);
    const next = Number.isFinite(current) ? current + amount : amount;
    setValue('quantity', next, { shouldValidate: true });
  };

  const onSubmit = async (data: ProductionFormData): Promise<void> => {
    const clientUuid = OfflineStorage.generateUuid();
    const recordedAtIso = new Date(data.recordedAt).toISOString();
    const nowIso = new Date().toISOString();

    // 1. Grava no buffer local do IndexedDB antes de qualquer tentativa de rede
    await OfflineStorage.saveEvent({
      clientUuid,
      type: 'PRODUCTION',
      endpoint: '/productions',
      payload: {
        allocationId,
        quantity: data.quantity,
        timestamp: recordedAtIso,
      },
      createdAt: nowIso,
      status: 'PENDING',
    });

    notifyStorageUpdated();
    onSuccess?.();
    onOpenChange(false);

    // 2. Tenta envio HTTP imediato via API
    try {
      await productionsService.create({
        clientUuid,
        allocationId,
        quantity: data.quantity,
        timestamp: recordedAtIso,
      });

      // Sucesso na API: marca como sincronizado no IndexedDB
      await OfflineStorage.markAsSynced([clientUuid]);
      notifyStorageUpdated();
      toast.success(`${data.quantity.toLocaleString('pt-BR')} garrafas registradas com sucesso.`);
    } catch {
      // Falha de rede: notifica que o dado está seguro no dispositivo
      toast.info(
        `${data.quantity.toLocaleString('pt-BR')} garrafas salvas localmente no dispositivo. Serão enviadas ao restabelecer a rede.`,
        { duration: 4000 },
      );
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

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
          {/* Input Principal de Quantidade de Grande Dimensão */}
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
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                placeholder="0"
                autoFocus
                {...register('quantity', { valueAsNumber: true })}
                className="h-20 text-center font-mono text-4xl sm:text-5xl font-black tracking-wider text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-primary shadow-inner"
              />
            </div>
            {errors.quantity && (
              <p className="text-center text-xs font-semibold text-destructive">
                {errors.quantity.message}
              </p>
            )}
          </div>

          {/* Atalhos de Incremento Rápido para Chão de Fábrica */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Adição rápida:</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 250, 500].map((step) => (
                <Button
                  key={step}
                  type="button"
                  variant="outline"
                  onClick={() => handleIncrement(step)}
                  className="min-h-[44px] font-mono text-xs font-bold hover:bg-primary/10 hover:text-primary active:scale-95 touch-manipulation"
                >
                  +{step}
                </Button>
              ))}
            </div>
          </div>

          {/* Horário do Apontamento */}
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <label
              htmlFor="production-recorded-at"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            >
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Horário do Lançamento</span>
            </label>
            <Input
              id="production-recorded-at"
              type="datetime-local"
              {...register('recordedAt')}
              className="min-h-[44px] font-mono text-sm text-foreground focus-visible:ring-primary touch-manipulation"
            />
            {errors.recordedAt && (
              <p className="text-xs font-semibold text-destructive">{errors.recordedAt.message}</p>
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
