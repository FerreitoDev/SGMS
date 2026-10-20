import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';

import {
  createOperatorSchema,
  CreateOperatorFormData,
} from '@/schemas/user-schema';
import { apiClient, extractProblemDetail } from '@/lib/api-client';
import { UserListItem } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

interface UserCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newUser: UserListItem) => void;
}

export function UserCreateSheet({
  open,
  onOpenChange,
  onSuccess,
}: UserCreateSheetProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOperatorFormData>({
    resolver: zodResolver(createOperatorSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  // Limpa o formulário sempre que a gaveta for fechada
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateOperatorFormData) => {
    try {
      const response = await apiClient.post<UserListItem>('/users', {
        name: data.name.trim(),
        username: data.username.trim(),
        password: data.password,
      });

      toast.success('Operador Cadastrado', {
        description: `O operador ${response.data.name} foi criado com sucesso.`,
      });

      reset();
      onSuccess(response.data);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro no Cadastro', {
        description: detail,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="h-5 w-5" />
            <SheetTitle>Novo Operador de Máquina</SheetTitle>
          </div>
          <SheetDescription>
            Cadastre um novo operador fabril com login e senha de acesso local.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-1 flex-col justify-between space-y-6 pt-4"
        >
          <div className="space-y-4">
            {/* Campo Nome Completo */}
            <div className="space-y-1.5">
              <label
                htmlFor="operator-name"
                className="text-sm font-medium text-foreground"
              >
                Nome Completo *
              </label>
              <Input
                id="operator-name"
                type="text"
                placeholder="ex: João da Silva"
                autoComplete="name"
                disabled={isSubmitting}
                className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs font-medium text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Campo Login / Matrícula */}
            <div className="space-y-1.5">
              <label
                htmlFor="operator-username"
                className="text-sm font-medium text-foreground"
              >
                Login ou Matrícula *
              </label>
              <Input
                id="operator-username"
                type="text"
                placeholder="ex: joao.silva"
                autoComplete="off"
                autoCapitalize="none"
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

            {/* Campo Senha Provisória */}
            <div className="space-y-1.5">
              <label
                htmlFor="operator-password"
                className="text-sm font-medium text-foreground"
              >
                Senha Inicial *
              </label>
              <Input
                id="operator-password"
                type="password"
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
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
          </div>

          <SheetFooter className="flex-col gap-2 pt-6 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Cadastrar Operador'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
export default UserCreateSheet;
