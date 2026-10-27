import React, { useState } from 'react';
import { Cpu, Clock, User, LogOut, ArrowLeftRight, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncBadge } from '@/components/sync/sync-badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import type { ShiftAllocation } from '@/types/domain';

export interface OperatorHeaderProps {
  allocation: ShiftAllocation;
  userName: string;
  onReleaseMachine: () => Promise<void>;
  onOpenCloseShift?: () => void;
  onLogout: () => void;
  isReleasing?: boolean;
}

export function OperatorHeader({
  allocation,
  userName,
  onReleaseMachine,
  onOpenCloseShift,
  onLogout,
  isReleasing = false,
}: OperatorHeaderProps): React.ReactElement {
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);

  const handleConfirmRelease = async (): Promise<void> => {
    await onReleaseMachine();
    setIsConfirmSheetOpen(false);
  };

  return (
    <header className="border-b border-border bg-card shadow-xs">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Identificação da Máquina e Turno */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-black tracking-tight text-foreground">
                {allocation.machine?.code}
              </h1>
              <span className="text-sm font-medium text-muted-foreground">
                {allocation.machine?.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>
                {allocation.shift?.name} ({allocation.shift?.startTime} às {allocation.shift?.endTime})
              </span>
            </div>
          </div>
        </div>

        {/* Status de Sincronização, Identificação do Operador e Ações */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 border-t border-border/40 sm:border-0">
          <SyncBadge />

          <div className="hidden md:flex items-center gap-1.5 rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{userName}</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCloseShift && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onOpenCloseShift}
                className="min-h-[44px] gap-1.5 text-xs font-bold touch-manipulation shadow-xs"
                title="Encerrar formalmente o turno nesta máquina"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Encerrar Turno</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmSheetOpen(true)}
              className="min-h-[44px] gap-1.5 text-xs font-semibold touch-manipulation"
              title="Trocar ou desocupar esta máquina"
            >
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <span>Liberar Máquina</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive touch-manipulation"
              title="Sair da sessão"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet de Confirmação para Desocupar a Máquina */}
      <Sheet open={isConfirmSheetOpen} onOpenChange={setIsConfirmSheetOpen}>
        <SheetContent side="bottom" className="sm:max-w-md mx-auto rounded-t-2xl">
          <SheetHeader className="text-left space-y-2">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Liberar {allocation.machine?.code}?
            </SheetTitle>
            <SheetDescription className="text-sm">
              Ao liberar a máquina, seu status voltará para <strong>Disponível (IDLE)</strong> para que outro
              operador possa assumi-la. Todos os apontamentos já registrados permanecem gravados.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmSheetOpen(false)}
              className="min-h-[44px] w-full sm:w-auto touch-manipulation"
              disabled={isReleasing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmRelease()}
              className="min-h-[44px] w-full sm:w-auto touch-manipulation font-bold"
              disabled={isReleasing}
            >
              {isReleasing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Liberando...
                </>
              ) : (
                'Confirmar Liberação'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  );
}
