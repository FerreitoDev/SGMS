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

export function OperatorConsoleShell(): React.ReactElement {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="success">Alocação Ativa</Badge>
            <Badge variant="outline">{user?.role}</Badge>
          </div>
          <CardTitle>Console Operacional da Sopradora</CardTitle>
          <CardDescription>
            Terminal pronto para registro de garrafas e paradas de linha (Fase 3).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded border border-border p-3 text-sm">
            <p>
              <strong>Operador:</strong> {user?.name} (@{user?.username})
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Máquina alocada com sucesso no turno.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="w-full min-h-[44px] touch-manipulation"
              onClick={() => (window.location.href = '/chao-de-fabrica/alocacao')}
            >
              Trocar Alocação
            </Button>
            <Button
              variant="destructive"
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
