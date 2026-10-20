import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Lock, User as UserIcon } from 'lucide-react';

import { loginSchema, LoginFormData } from '@/schemas/auth-schema';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, extractProblemDetail } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthenticatedUser } from '@/types/auth';

interface LoginApiResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export function LoginPage(): React.ReactElement {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  // Se já autenticado, redireciona para a tela do respectivo perfil
  if (user) {
    const destination = user.role === 'GERENTE' ? '/admin/users' : '/';
    return <Navigate to={destination} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiClient.post<LoginApiResponse>('/auth/login', {
        username: data.username.trim(),
        password: data.password,
      });

      const { accessToken, user: authenticatedUser } = response.data;
      login(accessToken, authenticatedUser);

      toast.success('Autenticação Realizada', {
        description: `Bem-vindo, ${authenticatedUser.name}!`,
      });

      // Redirecionamento condicional preservando rota original ou destino do perfil
      const locationState = location.state as { from?: { pathname: string } } | null;
      const targetFrom = locationState?.from?.pathname;

      if (targetFrom && targetFrom !== '/login') {
        navigate(targetFrom, { replace: true });
      } else {
        const defaultDestination =
          authenticatedUser.role === 'GERENTE' ? '/admin/users' : '/';
        navigate(defaultDestination, { replace: true });
      }
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Falha no Acesso', {
        description: detail,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md">
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="mx-auto flex items-center justify-center gap-2">
              <Badge variant="default" className="text-xs uppercase tracking-wider">
                GEPF Agroindústria
              </Badge>
              <Badge variant="outline" className="text-xs">
                Rede LAN
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                SGMS — Sopro
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Sistema de Gestão de Máquinas de Sopro
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
              {/* Campo Usuário */}
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Usuário ou Matrícula
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ex: operador.sopro ou gerente"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={isSubmitting}
                  className={errors.username ? 'border-destructive focus-visible:ring-destructive' : ''}
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Senha de Acesso
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-base font-semibold"
                size="default"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  'Entrar no Sistema'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Operação em servidor local na planta industrial.
        </p>
      </div>
    </div>
  );
}
export default LoginPage;
