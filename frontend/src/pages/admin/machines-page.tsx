import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Cpu, Plus, RefreshCw, Power, CheckCircle, XCircle } from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { MachineSheet } from '@/components/machines/machine-sheet';
import { Machine, MachineStatus } from '@/types/domain';
import { machinesService } from '@/services/machines-service';
import { extractProblemDetail } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

type StatusFilter = 'ALL' | MachineStatus;

export function MachinesPage(): React.ReactElement {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchMachines = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await machinesService.list();
      setMachines(data);
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro ao Carregar Sopradoras', {
        description: detail,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const handleCreateSuccess = (newMachine: Machine) => {
    setMachines((prev) => [newMachine, ...prev]);
  };

  const handleToggleActive = async (machine: Machine) => {
    const newIsActive = !machine.isActive;
    setUpdatingId(machine.id);

    // Atualização otimista
    setMachines((prev) =>
      prev.map((m) =>
        m.id === machine.id
          ? {
              ...m,
              isActive: newIsActive,
              status: !newIsActive ? 'INACTIVE' : 'IDLE',
            }
          : m
      )
    );

    try {
      const updated = await machinesService.updateStatus(machine.id, {
        isActive: newIsActive,
      });

      setMachines((prev) =>
        prev.map((m) => (m.id === machine.id ? updated : m))
      );

      toast.success('Status da Sopradora Atualizado', {
        description: `A máquina ${machine.code} foi ${
          newIsActive ? 'ativada' : 'desativada'
        } com sucesso.`,
      });
    } catch (err: unknown) {
      // Rollback imediato (Zero Fallback)
      setMachines((prev) =>
        prev.map((m) => (m.id === machine.id ? machine : m))
      );
      const detail = extractProblemDetail(err);
      toast.error('Falha ao Alterar Status', {
        description: detail,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMachines = machines.filter((m) => {
    if (statusFilter !== 'ALL' && m.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = m.code.toLowerCase().includes(q);
      const nameMatch = m.name.toLowerCase().includes(q);
      const modelMatch = m.model ? m.model.toLowerCase().includes(q) : false;
      return codeMatch || nameMatch || modelMatch;
    }
    return true;
  });

  const renderStatusBadge = (status: MachineStatus) => {
    switch (status) {
      case 'RUNNING':
        return (
          <Badge
            variant="success"
            className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold"
          >
            Em Produção
          </Badge>
        );
      case 'STOPPED':
        return (
          <Badge
            variant="destructive"
            className="border border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold"
          >
            Parada
          </Badge>
        );
      case 'IDLE':
        return (
          <Badge
            variant="info"
            className="border border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold"
          >
            Disponível
          </Badge>
        );
      case 'INACTIVE':
      default:
        return (
          <Badge
            variant="secondary"
            className="border border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-400 font-semibold"
          >
            Inativa
          </Badge>
        );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Parque de Sopradoras
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastro, monitoramento operacional e ativação de máquinas de sopro fabris.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              disabled={isLoading}
              onClick={fetchMachines}
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
              <span>Nova Sopradora</span>
            </Button>
          </div>
        </div>

        {/* Card Principal da Tabela */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Sopradoras Cadastradas ({filteredMachines.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Visão consolidada das máquinas industriais e seus estados operacionais.
                </CardDescription>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar por código ou nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 min-w-[200px] rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring touch-manipulation"
                />

                <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
                  {(
                    [
                      { key: 'ALL', label: 'Todas' },
                      { key: 'IDLE', label: 'Disponíveis' },
                      { key: 'RUNNING', label: 'Em Produção' },
                      { key: 'STOPPED', label: 'Paradas' },
                      { key: 'INACTIVE', label: 'Inativas' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={`min-h-[40px] rounded px-3 py-1 text-xs font-medium transition-colors touch-manipulation ${
                        statusFilter === tab.key
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[140px] font-semibold text-foreground">
                      Código
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Nome da Sopradora
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Modelo / Fabricante
                    </TableHead>
                    <TableHead className="w-[140px] font-semibold text-foreground">
                      Status Operacional
                    </TableHead>
                    <TableHead className="w-[110px] font-semibold text-foreground">
                      Ativação
                    </TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-foreground">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading && machines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Carregando parque de máquinas...
                      </TableCell>
                    </TableRow>
                  ) : filteredMachines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Nenhuma máquina encontrada com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMachines.map((m) => (
                      <TableRow key={m.id} className="border-border hover:bg-muted/40">
                        <TableCell className="font-mono font-bold text-primary">
                          {m.code}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {m.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {/* Zero Fallback: modelo nulo exibido explicitamente com traço '-' */}
                          {m.model ?? '-'}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(m.status)}
                        </TableCell>
                        <TableCell>
                          {m.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              <XCircle className="h-3.5 w-3.5" />
                              Inativa
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={m.isActive ? 'outline' : 'default'}
                            size="sm"
                            disabled={updatingId === m.id}
                            onClick={() => handleToggleActive(m)}
                            className={`min-h-[44px] min-w-[44px] gap-1 px-3 text-xs touch-manipulation ${
                              m.isActive
                                ? 'text-muted-foreground hover:border-destructive hover:text-destructive'
                                : 'bg-primary text-primary-foreground'
                            }`}
                            title={
                              m.isActive
                                ? 'Desativar sopradora'
                                : 'Ativar sopradora'
                            }
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>{m.isActive ? 'Desativar' : 'Ativar'}</span>
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

      {/* Gaveta Sheet de Cadastro de Nova Sopradora */}
      <MachineSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSuccess={handleCreateSuccess}
      />
    </AppLayout>
  );
}

export default MachinesPage;
