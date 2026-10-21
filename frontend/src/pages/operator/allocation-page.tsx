import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Cpu,
  Clock,
  Calendar,
  LogOut,
  Loader2,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useCurrentAllocation } from '@/hooks/use-current-allocation';
import { Machine, Shift } from '@/types/domain';
import { machinesService } from '@/services/machines-service';
import { shiftsService } from '@/services/shifts-service';
import { allocationsService } from '@/services/allocations-service';
import { extractProblemDetail } from '@/lib/api-client';
import { MachineCard } from '@/components/machines/machine-card';
import { ShiftCard } from '@/components/shifts/shift-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AllocationPage(): React.ReactElement {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { allocation, isLoading: isCheckingAllocation } = useCurrentAllocation();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [shiftDate] = useState<string>(getTodayLocalDate());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Redirecionamento automático se o operador já tiver alocação ativa (RN-01)
  useEffect(() => {
    if (allocation && allocation.status === 'ACTIVE') {
      const machineCode = allocation.machine?.code ? allocation.machine.code : 'máquina';
      toast.info('Retomando Operação', {
        description: `Retomando operação da ${machineCode}.`,
      });
      navigate('/chao-de-fabrica/console', { replace: true });
    }
  }, [allocation, navigate]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [machinesData, shiftsData] = await Promise.all([
        machinesService.list({ isActive: true }),
        shiftsService.list({ isActive: true }),
      ]);

      setMachines(machinesData);
      setShifts(shiftsData);

      // Pré-seleciona o primeiro turno ativo se disponível
      if (shiftsData.length > 0 && !selectedShift) {
        setSelectedShift(shiftsData[0]);
      }
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro ao Carregar Dados Operacionais', {
        description: detail,
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedShift]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmAllocation = async () => {
    if (!selectedMachine) {
      toast.error('Selecione uma Sopradora', {
        description: 'É necessário escolher uma máquina desimpedida para assumir.',
      });
      return;
    }

    if (!selectedShift) {
      toast.error('Selecione um Turno', {
        description: 'Selecione o turno correspondente à sua escala de trabalho.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await allocationsService.create({
        machineId: selectedMachine.id,
        shiftId: selectedShift.id,
        shiftDate,
      });

      toast.success('Máquina Assumida com Sucesso!', {
        description: `Você assumiu a ${selectedMachine.code} no ${selectedShift.name}.`,
      });

      navigate('/chao-de-fabrica/console');
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);

      // Em caso de concorrência ou máquina ocupada (HTTP 409)
      // Atualiza o card local para RUNNING e limpa seleção
      setMachines((prev) =>
        prev.map((m) =>
          m.id === selectedMachine.id
            ? { ...m, status: 'RUNNING' }
            : m
        )
      );
      setSelectedMachine(null);

      toast.error('Máquina já alocada por outro operador.', {
        description: detail,
      });

      // Recarrega lista para sincronizar estado em background
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enquanto verifica a alocação atual do operador, evita flicker de tela
  if (isCheckingAllocation && !allocation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Verificando alocação ativa do operador...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased pb-28">
      {/* Cabeçalho Operacional Touch */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
              GEPF
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground">
                SGMS Operação
              </span>
              <span className="text-[11px] text-muted-foreground">
                Início de Jornada
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-foreground">
                  {user.name}
                </span>
                <Badge variant="outline" className="text-[9px] uppercase font-semibold">
                  {user.role}
                </Badge>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-foreground touch-manipulation"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex min-h-[44px] items-center gap-1.5 px-3 text-xs text-muted-foreground hover:text-destructive touch-manipulation"
              title="Encerrar sessão"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
        {/* Banner Informativo com Data e Operador */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Alocação de Sopradora
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Selecione o turno e a máquina desimpedida para assumir a operação.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="secondary" className="flex items-center gap-1.5 py-1 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>{shiftDate}</span>
              </Badge>
              <Badge variant="outline" className="py-1 text-xs font-semibold">
                Operador: {user?.username}
              </Badge>
            </div>
          </div>
        </div>

        {/* Passo 1: Seleção de Turno */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              1. Selecione o Turno de Trabalho
            </h2>
          </div>

          {isLoading && shifts.length === 0 ? (
            <div className="flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
              Carregando escalas de turnos...
            </div>
          ) : shifts.length === 0 ? (
            <div className="flex min-h-[72px] items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Nenhum turno ativo encontrado. Solicite ao gerente a configuração dos turnos.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  isSelected={selectedShift?.id === shift.id}
                  onSelect={setSelectedShift}
                />
              ))}
            </div>
          )}
        </section>

        {/* Passo 2: Seleção de Sopradora */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">
                2. Selecione a Sopradora Industrial
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {machines.filter((m) => m.isActive && m.status !== 'RUNNING' && m.status !== 'INACTIVE').length} disponíveis
            </span>
          </div>

          {isLoading && machines.length === 0 ? (
            <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
              Carregando parque de máquinas...
            </div>
          ) : machines.length === 0 ? (
            <div className="flex min-h-[100px] items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Nenhuma máquina ativa cadastrada. Solicite ao gerente o cadastro de sopradoras.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {machines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  isSelected={selectedMachine?.id === machine.id}
                  onSelect={setSelectedMachine}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Barra Inferior Fixa de Ação Touch */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 p-4 shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="hidden sm:flex flex-col">
            <span className="text-xs text-muted-foreground">
              Máquina Selecionada:
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              {selectedMachine ? `${selectedMachine.code} (${selectedMachine.name})` : 'Nenhuma selecionada'}
            </span>
          </div>

          <Button
            type="button"
            size="lg"
            disabled={!selectedMachine || !selectedShift || isSubmitting || isLoading}
            onClick={handleConfirmAllocation}
            className="flex min-h-[52px] w-full sm:w-auto flex-1 sm:flex-initial items-center justify-center gap-2 text-base font-bold touch-manipulation shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Assumindo Máquina...</span>
              </>
            ) : selectedMachine ? (
              <>
                <span>Assumir {selectedMachine.code}</span>
                <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              <span>Selecione uma Sopradora</span>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default AllocationPage;
