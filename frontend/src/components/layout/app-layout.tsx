import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Users, Cpu, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Barra Superior Corporativa */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Marca / Identidade */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                GEPF Agro
              </span>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground">
                  SGMS
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Gestão de Máquinas de Sopro
                </span>
              </div>
            </div>

            {/* Navegação Administrativa (visível para perfil GERENTE) */}
            {user?.role === 'GERENTE' && (
              <nav className="hidden md:flex items-center gap-1 border-l border-border pl-6">
                <NavLink
                  to="/admin/machines"
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <Cpu className="h-4 w-4" />
                  <span>Sopradoras</span>
                </NavLink>

                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <Users className="h-4 w-4" />
                  <span>Operadores</span>
                </NavLink>

                <NavLink
                  to="/admin/shifts"
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <Clock className="h-4 w-4" />
                  <span>Turnos</span>
                </NavLink>
              </nav>
            )}
          </div>

          {/* Dados do Usuário & Ação de Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user && (
              <div className="flex items-center gap-2 text-right">
                <div className="hidden sm:flex sm:flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    @{user.username}
                  </span>
                </div>
                <Badge
                  variant={user.role === 'GERENTE' ? 'default' : 'secondary'}
                  className="text-[10px] uppercase font-semibold"
                >
                  {user.role}
                </Badge>
              </div>
            )}

            <Button
              variant="outline"
              size="default"
              onClick={logout}
              className="flex min-h-[44px] items-center gap-1.5 px-3 text-xs text-muted-foreground hover:text-destructive touch-manipulation"
              aria-label="Encerrar sessão"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* Navegação Secundária Mobile para perfil GERENTE */}
        {user?.role === 'GERENTE' && (
          <div className="flex md:hidden border-t border-border bg-muted/20 px-3 py-1 gap-1 overflow-x-auto">
            <NavLink
              to="/admin/machines"
              className={({ isActive }) =>
                `flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors touch-manipulation ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Cpu className="h-4 w-4" />
              <span>Sopradoras</span>
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors touch-manipulation ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Users className="h-4 w-4" />
              <span>Operadores</span>
            </NavLink>
            <NavLink
              to="/admin/shifts"
              className={({ isActive }) =>
                `flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors touch-manipulation ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Clock className="h-4 w-4" />
              <span>Turnos</span>
            </NavLink>
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
export default AppLayout;
