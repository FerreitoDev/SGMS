import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { UserPlus, RefreshCw, Power, CheckCircle, XCircle } from 'lucide-react';

import { AppLayout } from '@/components/layout/app-layout';
import { UserCreateSheet } from '@/components/users/user-create-sheet';
import { UserListItem } from '@/types/auth';
import { apiClient, extractProblemDetail } from '@/lib/api-client';
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

export function UsersPage(): React.ReactElement {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<UserListItem[]>('/users');
      setUsers(response.data);
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro ao Carregar Operadores', {
        description: detail,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateSuccess = (newUser: UserListItem) => {
    setUsers((prev) => [newUser, ...prev]);
  };

  const handleToggleStatus = async (user: UserListItem) => {
    const newStatus = !user.isActive;
    setUpdatingId(user.id);

    // Atualização otimista
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
    );

    try {
      const response = await apiClient.patch<UserListItem>(`/users/${user.id}/status`, {
        isActive: newStatus,
      });

      // Atualiza com dados confirmados da API
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? response.data : u))
      );

      toast.success('Status Atualizado', {
        description: `O operador ${user.name} está agora ${
          newStatus ? 'ativo' : 'inativo'
        }.`,
      });
    } catch (err: unknown) {
      // Rollback imediato em caso de falha (Zero Fallback)
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
      );
      const detail = extractProblemDetail(err);
      toast.error('Falha ao Alterar Status', {
        description: detail,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter === 'ACTIVE') return u.isActive;
    if (statusFilter === 'INACTIVE') return !u.isActive;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho da Página com Ações Primárias */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Gestão de Operadores
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Controle de contas e permissão de acesso para o chão de fábrica
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={fetchUsers}
              disabled={isLoading}
              className="flex min-h-[44px] items-center gap-2"
              title="Recarregar lista de operadores"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            <Button
              onClick={() => setIsSheetOpen(true)}
              size="default"
              className="flex min-h-[44px] items-center gap-2 font-semibold"
            >
              <UserPlus className="h-5 w-5" />
              <span>Novo Operador</span>
            </Button>
          </div>
        </div>

        {/* Card Principal com Tabela e Filtros */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Operadores Cadastrados
                </CardTitle>
                <CardDescription>
                  Total de {users.length} operador(es) registrado(s) no sistema local
                </CardDescription>
              </div>

              {/* Filtros de Status */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`flex min-h-[44px] items-center rounded px-3 py-1.5 font-medium transition-colors touch-manipulation ${
                    statusFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todos ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`flex min-h-[44px] items-center rounded px-3 py-1.5 font-medium transition-colors touch-manipulation ${
                    statusFilter === 'ACTIVE'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Ativos ({users.filter((u) => u.isActive).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`flex min-h-[44px] items-center rounded px-3 py-1.5 font-medium transition-colors touch-manipulation ${
                    statusFilter === 'INACTIVE'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inativos ({users.filter((u) => !u.isActive).length})
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center p-8">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Carregando operadores locais...</span>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
                <p className="text-base font-semibold text-foreground">
                  Nenhum operador encontrado
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {statusFilter === 'ALL'
                    ? 'Clique no botão "+ Novo Operador" para iniciar os cadastros.'
                    : 'Não há operadores com o status selecionado.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Nome</TableHead>
                      <TableHead className="font-semibold">Login / Matrícula</TableHead>
                      <TableHead className="font-semibold">Perfil</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((operator) => {
                      const isUpdating = updatingId === operator.id;
                      return (
                        <TableRow key={operator.id}>
                          <TableCell className="font-medium text-foreground">
                            {operator.name}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {operator.username}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {operator.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {operator.isActive ? (
                              <Badge
                                variant="success"
                                className="flex w-fit items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Ativo
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="flex w-fit items-center gap-1 text-muted-foreground"
                              >
                                <XCircle className="h-3 w-3" />
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={operator.isActive ? 'outline' : 'default'}
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => handleToggleStatus(operator)}
                              className="min-h-[44px] min-w-[80px] gap-1.5 text-xs font-semibold touch-manipulation"
                            >
                              <Power className="h-3.5 w-3.5" />
                              {operator.isActive ? 'Inativar' : 'Ativar'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gaveta Sheet de Cadastro de Operador */}
      <UserCreateSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSuccess={handleCreateSuccess}
      />
    </AppLayout>
  );
}
export default UsersPage;
