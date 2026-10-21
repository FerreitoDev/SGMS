import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/hooks/use-auth';
import { LoginPage } from '@/pages/login-page';
import { UsersPage } from '@/pages/users-page';
import { MachinesPage } from '@/pages/admin/machines-page';
import { ShiftsPage } from '@/pages/admin/shifts-page';
import { AllocationPage } from '@/pages/operator/allocation-page';
import { OperatorConsolePage } from '@/pages/operator/operator-console-page';

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
          element={<OperatorConsolePage />}
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
