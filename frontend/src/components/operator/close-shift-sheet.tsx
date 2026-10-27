import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Loader2,
  ShieldAlert,
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
import { Card, CardContent } from '@/components/ui/card';
import { allocationsService } from '@/services/allocations-service';
import type { ShiftAllocation } from '@/types/domain';

export interface CloseShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: ShiftAllocation;
  totalQuantity: number;
  downtimesCount: number;
  onSuccess?: () => void;
}

export function CloseShiftSheet({
  open,
  onOpenChange,
  allocation,
  totalQuantity,
  downtimesCount,
  onSuccess,
}: CloseShiftSheetProps): React.ReactElement {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const handleConfirmClose = async (): Promise<void> => {
    try {
      setIsClosing(true);
      await allocationsService.close(allocation.id);
      toast.success('Turno encerrado com sucesso!');
      onOpenChange(false);
      onSuccess?.();
      navigate('/chao-de-fabrica/alocacao', { replace: true });
    } catch {
      toast.error('Não foi possível encerrar o turno. Verifique a conexão e tente novamente.');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto sm:max-w-lg mx-auto rounded-t-2xl px-5 py-6 space-y-5"
      >
        <SheetHeader className="text-left space-y-2">
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 border border-destructive/25">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-black tracking-tight text-foreground">
                Encerrar Turno de Produção
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Fechamento formal da jornada operacional nesta máquina
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Identificação da Alocação */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="font-mono font-bold text-foreground">
              {allocation.machine?.code}
            </span>
            <span className="text-muted-foreground">—</span>
            <span className="text-muted-foreground truncate max-w-[140px]">
              {allocation.machine?.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{allocation.shift?.name}</span>
          </div>
        </div>

        {/* Resumo Consolidado do Turno */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Resumo dos Apontamentos Realizados
          </span>
          <div className="grid grid-cols-2 gap-3">
            <Card className="border border-border/60 bg-card/80">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Produção Acumulada
                </span>
                <p className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalQuantity.toLocaleString('pt-BR')}
                </p>
                <span className="text-[10px] text-muted-foreground">garrafas sopradas</span>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/80">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Paradas de Linha
                </span>
                <p className="font-mono text-xl font-black text-foreground">
                  {downtimesCount}
                </p>
                <span className="text-[10px] text-muted-foreground">registros apontados</span>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alerta de Imutabilidade Irreversível (RN-06) */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold">Atenção (Ação Irreversível):</strong>
            <p className="leading-relaxed opacity-90">
              Ao encerrar o turno, a máquina será desocupada e voltará ao status disponível (IDLE). Nenhum novo
              apontamento de garrafas ou paradas poderá ser realizado nesta alocação.
            </p>
          </div>
        </div>

        {/* Ações do Footer */}
        <SheetFooter className="mt-4 flex-col sm:flex-row gap-2.5 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isClosing}
            className="min-h-[48px] w-full sm:w-auto font-medium touch-manipulation order-2 sm:order-1"
          >
            Continuar Operando
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirmClose()}
            disabled={isClosing}
            className="min-h-[48px] w-full sm:w-auto font-black shadow-md touch-manipulation order-1 sm:order-2 flex items-center justify-center gap-2"
          >
            {isClosing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Encerrando Turno...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Encerrar Turno Agora</span>
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
