import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Cpu } from 'lucide-react';

import {
  machineSchema,
  MachineFormData,
} from '@/schemas/machine-schema';
import { machinesService } from '@/services/machines-service';
import { Machine } from '@/types/domain';
import { extractProblemDetail } from '@/lib/api-client';
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

interface MachineSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newMachine: Machine) => void;
}

export function MachineSheet({
  open,
  onOpenChange,
  onSuccess,
}: MachineSheetProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      code: '',
      name: '',
      model: '',
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: MachineFormData) => {
    try {
      const trimmedModel =
        data.model && data.model.trim().length > 0 ? data.model.trim() : null;

      const newMachine = await machinesService.create({
        code: data.code.trim(),
        name: data.name.trim(),
        model: trimmedModel,
      });

      toast.success('Sopradora Cadastrada', {
        description: `A máquina ${newMachine.code} (${newMachine.name}) foi cadastrada com sucesso.`,
      });

      reset();
      onSuccess(newMachine);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro no Cadastro da Sopradora', {
        description: detail,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2 text-primary">
            <Cpu className="h-5 w-5" />
            <SheetTitle>Nova Sopradora Industrial</SheetTitle>
          </div>
          <SheetDescription>
            Cadastre uma nova máquina sopradora no parque industrial de sopro.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-1 flex-col justify-between space-y-6 pt-4"
        >
          <div className="space-y-4">
            {/* Campo Código da Máquina */}
            <div className="space-y-1.5">
              <label
                htmlFor="machine-code"
                className="text-sm font-medium text-foreground"
              >
                Código Identificador *
              </label>
              <Input
                id="machine-code"
                type="text"
                placeholder="ex: SOPRO-01"
                autoComplete="off"
                disabled={isSubmitting}
                className={errors.code ? 'border-destructive focus-visible:ring-destructive' : ''}
                {...register('code')}
              />
              {errors.code && (
                <p className="text-xs font-medium text-destructive">
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Campo Nome da Sopradora */}
            <div className="space-y-1.5">
              <label
                htmlFor="machine-name"
                className="text-sm font-medium text-foreground"
              >
                Nome da Máquina *
              </label>
              <Input
                id="machine-name"
                type="text"
                placeholder="ex: Sopradora Linha 1"
                autoComplete="off"
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

            {/* Campo Modelo / Fabricante (Opcional) */}
            <div className="space-y-1.5">
              <label
                htmlFor="machine-model"
                className="text-sm font-medium text-foreground"
              >
                Modelo ou Fabricante (Opcional)
              </label>
              <Input
                id="machine-model"
                type="text"
                placeholder="ex: Krones Contiform 3"
                autoComplete="off"
                disabled={isSubmitting}
                className={errors.model ? 'border-destructive focus-visible:ring-destructive' : ''}
                {...register('model')}
              />
              {errors.model && (
                <p className="text-xs font-medium text-destructive">
                  {errors.model.message}
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
              className="min-h-[44px] w-full sm:w-auto touch-manipulation"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] w-full sm:w-auto touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Cadastrar Sopradora'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
export default MachineSheet;
