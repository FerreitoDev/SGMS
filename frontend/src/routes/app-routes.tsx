import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { LoginPage } from '@/pages/login-page';
import { UsersPage } from '@/pages/users-page';
import { MachinesPage } from '@/pages/admin/machines-page';
import { ShiftsPage } from '@/pages/admin/shifts-page';
import { AllocationPage } from '@/pages/operator/allocation-page';
import { useCurrentAllocation } from '@/hooks/use-current-allocation';
import { allocationsService } from '@/services/allocations-service';
import { toast } from 'sonner';
import { Cpu, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export function OperatorConsoleShell(): React.ReactElement {
  const { user, logout } = useAuth();
  const { allocation, isLoading, refetch } = useCurrentAllocation();
  const [isReleasing, setIsReleasing] = React.useState<boolean>(false);

  const handleRelease = async () => {
    if (!allocation) return;
    setIsReleasing(true);
    try {
      await allocationsService.release(allocation.id);
      toast.success('Máquina Liberada com Sucesso', {
        description: `A jornada na máquina ${allocation.machine?.code ?? ''} foi encerrada.`,
      });
      await refetch();
      window.location.href = '/chao-de-fabrica/alocacao';
    } catch {
      toast.error('Erro ao Liberar Máquina', {
        description: 'Não foi possível encerrar a alocação no momento.',
      });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Alocação Ativa
            </Badge>
            <Badge variant="outline">{user?.role}</Badge>
          </div>
          <CardTitle>Console Operacional da Sopradora</CardTitle>
          <CardDescription>
            Terminal pronto para registro de garrafas e paradas de linha (Fase 3).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
              Carregando dados da alocação...
            </div>
          ) : allocation ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3.5 text-sm">
              <div className="flex items-center gap-2 font-mono text-base font-bold text-primary">
                <Cpu className="h-4 w-4" />
                <span>
                  {allocation.machine?.code} — {allocation.machine?.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {allocation.shift?.name} ({allocation.shift?.startTime} às{' '}
                  {allocation.shift?.endTime})
                </span>
              </div>
              <div className="border-t border-border/60 pt-2 text-xs">
                <p>
                  <strong>Operador:</strong> {user?.name} (@{user?.username})
                </p>
                <p className="text-muted-foreground">
                  Data: {allocation.shiftDate.split('T')[0]}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Nenhuma alocação ativa encontrada no momento.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {allocation ? (
              <Button
                variant="outline"
                disabled={isReleasing}
                className="w-full min-h-[44px] touch-manipulation text-destructive hover:bg-destructive/10"
                onClick={handleRelease}
              >
                {isReleasing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Liberando...
                  </>
                ) : (
                  'Liberar Máquina'
                )}
              </Button>
            ) : (
              <Button
                variant="default"
                className="w-full min-h-[44px] touch-manipulation"
                onClick={() => (window.location.href = '/chao-de-fabrica/alocacao')}
              >
                Ir para Alocação de Máquinas
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full min-h-[44px] touch-manipulation"
              onClick={logout}
            >
              Encerrar Sessão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function HomeRedirect(): React.ReactElement {
  const { user } = useAuth();
  if (user?.role === 'GERENTE') {
    return <Navigate to="/admin/machines" replace />;
  }
  return <Navigate to="/chao-de-fabrica/alocacao" replace />;
}

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rota Raiz com Redirecionamento Contextual por Papel */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/chao-de-fabrica/alocacao"
          element={<AllocationPage />}
        />
        <Route
          path="/chao-de-fabrica/console"
          element={<OperatorConsoleShell />}
        />
      </Route>

      {/* Rota Protegida Exclusiva: exige perfil GERENTE */}
      <Route element={<ProtectedRoute requiredRole="GERENTE" />}>
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/machines" element={<MachinesPage />} />
        <Route path="/admin/shifts" element={<ShiftsPage />} />
      </Route>

      {/* Redirecionamento padrão para rota raiz */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
