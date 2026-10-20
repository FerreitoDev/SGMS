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

export function LoginPageShell(): React.ReactElement {
  const { user, login } = useAuth();

  if (user) {
    return (
      <Navigate
        to={user.role === 'GERENTE' ? '/admin/users' : '/'}
        replace
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-sm">
        <CardHeader>
          <Badge className="mb-2 w-fit">Acesso Corporativo</Badge>
          <CardTitle>SGMS — Autenticação</CardTitle>
          <CardDescription>
            Ambiente de autenticação e validação de sessão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={() =>
              login('token_gerente_valido', {
                id: 'gerente-01',
                name: 'Gerente da Planta',
                username: 'gerente.sopro',
                role: 'GERENTE',
              })
            }
          >
            Entrar como Gerente
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              login('token_operador_valido', {
                id: 'operador-01',
                name: 'Operador Fabril',
                username: 'operador.sopro',
                role: 'OPERADOR',
              })
            }
          >
            Entrar como Operador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminUsersPageShell(): React.ReactElement {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="success">Área Administrativa</Badge>
            <Badge variant="outline">GERENTE</Badge>
          </div>
          <CardTitle>Gestão de Operadores</CardTitle>
          <CardDescription>
            Rota restrita `/admin/users` — Autorização confirmada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded border border-border p-3 text-sm">
            <p>
              <strong>Usuário:</strong> {user?.name} ({user?.username})
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
      <Route path="/login" element={<LoginPageShell />} />

      {/* Rota Protegida Geral: exige usuário autenticado */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<OperatorHomeShell />} />
      </Route>

      {/* Rota Protegida Exclusiva: exige perfil GERENTE */}
      <Route element={<ProtectedRoute requiredRole="GERENTE" />}>
        <Route path="/admin/users" element={<AdminUsersPageShell />} />
      </Route>

      {/* Redirecionamento padrão para rota raiz */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
