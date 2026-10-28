import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types/auth';

export interface ProtectedRouteProps {
  requiredRole?: UserRole;
  children?: React.ReactNode;
}

export function ProtectedRoute({
  requiredRole,
  children,
}: ProtectedRouteProps): React.ReactElement {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();
  const toastFiredRef = useRef(false);

  const isRoleInsufficient = Boolean(
    user && requiredRole && user.role !== requiredRole
  );

  useEffect(() => {
    if (isRoleInsufficient && !toastFiredRef.current) {
      toastFiredRef.current = true;
      toast.error('Acesso Não Autorizado', {
        description: `Seu perfil (${user?.role}) não possui permissão para acessar esta área.`,
      });
    }
  }, [isRoleInsufficient, user?.role]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  // Não autenticado: redireciona para login preservando rota de origem
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Papel insuficiente (ex: OPERADOR tentando acessar /admin/* ou GERENTE tentando acessar /chao-de-fabrica/*)
  if (isRoleInsufficient) {
    const fallbackPath =
      user.role === 'GERENTE' ? '/admin/dashboard' : '/chao-de-fabrica/alocacao';
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
