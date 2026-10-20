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

export function OperatorHomeShell(): React.ReactElement {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="info">Chão de Fábrica</Badge>
            <Badge variant="outline">OPERADOR</Badge>
          </div>
          <CardTitle>SGMS — Terminal de Operação</CardTitle>
          <CardDescription>
            Console de apontamentos de produção e paradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded border border-border p-3 text-sm">
            <p>
              <strong>Operador:</strong> {user?.name} ({user?.username})
            </p>
            <p>
              <strong>Perfil:</strong> {user?.role}
            </p>
          </div>
          <Button variant="destructive" className="w-full" onClick={logout}>
            Encerrar Sessão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rota Protegida Geral: exige usuário autenticado */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<OperatorHomeShell />} />
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
