import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Clock, Plus, RefreshCw, Power, CheckCircle, XCircle } from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { ShiftSheet } from '@/components/shifts/shift-sheet';
import { Shift } from '@/types/domain';
import { shiftsService } from '@/services/shifts-service';
import { calculateShiftDuration } from '@/schemas/shift-schema';
import { extractProblemDetail } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export function ShiftsPage(): React.ReactElement {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchShifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await shiftsService.list();
      setShifts(data);
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro ao Carregar Turnos', {
        description: detail,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleCreateSuccess = (newShift: Shift) => {
    setShifts((prev) => [...prev, newShift]);
  };

  const handleToggleActive = async (shift: Shift) => {
    const newIsActive = !shift.isActive;
    setUpdatingId(shift.id);

    // Atualização otimista
    setShifts((prev) =>
      prev.map((s) => (s.id === shift.id ? { ...s, isActive: newIsActive } : s))
    );

    try {
      const updated = await shiftsService.updateStatus(shift.id, {
        isActive: newIsActive,
      });

      setShifts((prev) =>
        prev.map((s) => (s.id === shift.id ? updated : s))
      );

      toast.success('Status do Turno Atualizado', {
        description: `O turno ${shift.name} está agora ${
          newIsActive ? 'ativo' : 'inativo'
        }.`,
      });
    } catch (err: unknown) {
      // Rollback imediato (Zero Fallback)
      setShifts((prev) =>
        prev.map((s) => (s.id === shift.id ? shift : s))
      );
      const detail = extractProblemDetail(err);
      toast.error('Falha ao Alterar Status', {
        description: detail,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Grade de Turnos Fabris
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Configuração e manutenção dos horários oficiais das jornadas operacionais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              disabled={isLoading}
              onClick={fetchShifts}
              className="flex min-h-[44px] items-center gap-2 px-3 text-sm touch-manipulation"
              title="Recarregar lista"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            <Button
              variant="default"
              size="default"
              onClick={() => setIsSheetOpen(true)}
              className="flex min-h-[44px] items-center gap-2 px-4 text-sm font-semibold touch-manipulation"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Turno</span>
            </Button>
          </div>
        </div>

        {/* Card Principal da Tabela */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              Turnos Configurados ({shifts.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Horários de início, término e duração das escalas de sopro industrial.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground">
                      Nome do Turno
                    </TableHead>
                    <TableHead className="w-[140px] font-semibold text-foreground">
                      Horário Início
                    </TableHead>
                    <TableHead className="w-[140px] font-semibold text-foreground">
                      Horário Término
                    </TableHead>
                    <TableHead className="w-[140px] font-semibold text-foreground">
                      Duração Prevista
                    </TableHead>
                    <TableHead className="w-[120px] font-semibold text-foreground">
                      Status
                    </TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-foreground">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading && shifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Carregando grade de turnos...
                      </TableCell>
                    </TableRow>
                  ) : shifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Nenhum turno cadastrado até o momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shifts.map((s) => (
                      <TableRow key={s.id} className="border-border hover:bg-muted/40">
                        <TableCell className="font-medium text-foreground">
                          {s.name}
                        </TableCell>
                        <TableCell className="font-mono text-foreground font-semibold">
                          {s.startTime}
                        </TableCell>
                        <TableCell className="font-mono text-foreground font-semibold">
                          {s.endTime}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {calculateShiftDuration(s.startTime, s.endTime)}
                        </TableCell>
                        <TableCell>
                          {s.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              <XCircle className="h-3.5 w-3.5" />
                              Inativo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={s.isActive ? 'outline' : 'default'}
                            size="sm"
                            disabled={updatingId === s.id}
                            onClick={() => handleToggleActive(s)}
                            className={`min-h-[44px] min-w-[44px] gap-1 px-3 text-xs touch-manipulation ${
                              s.isActive
                                ? 'text-muted-foreground hover:border-destructive hover:text-destructive'
                                : 'bg-primary text-primary-foreground'
                            }`}
                            title={s.isActive ? 'Desativar turno' : 'Ativar turno'}
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>{s.isActive ? 'Desativar' : 'Ativar'}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gaveta Sheet de Cadastro de Novo Turno */}
      <ShiftSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSuccess={handleCreateSuccess}
      />
    </AppLayout>
  );
}

export default ShiftsPage;
