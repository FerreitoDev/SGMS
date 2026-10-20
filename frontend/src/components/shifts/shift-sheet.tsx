import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';

import {
  shiftSchema,
  ShiftFormData,
  calculateShiftDuration,
} from '@/schemas/shift-schema';
import { shiftsService } from '@/services/shifts-service';
import { Shift } from '@/types/domain';
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

interface ShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newShift: Shift) => void;
}

export function ShiftSheet({
  open,
  onOpenChange,
  onSuccess,
}: ShiftSheetProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: '',
      startTime: '',
      endTime: '',
    },
    mode: 'onSubmit',
  });

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const durationPreview = calculateShiftDuration(startTime, endTime);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: ShiftFormData) => {
    try {
      const newShift = await shiftsService.create({
        name: data.name.trim(),
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
      });

      toast.success('Turno Cadastrado', {
        description: `O turno ${newShift.name} (${newShift.startTime} às ${newShift.endTime}) foi criado com sucesso.`,
      });

      reset();
      onSuccess(newShift);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail = extractProblemDetail(err);
      toast.error('Erro no Cadastro do Turno', {
        description: detail,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2 text-primary">
            <Clock className="h-5 w-5" />
            <SheetTitle>Novo Turno de Produção</SheetTitle>
          </div>
          <SheetDescription>
            Configure um turno fabril com os horários oficiais de início e término da operação.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-1 flex-col justify-between space-y-6 pt-4"
        >
          <div className="space-y-4">
            {/* Campo Nome do Turno */}
            <div className="space-y-1.5">
              <label
                htmlFor="shift-name"
                className="text-sm font-medium text-foreground"
              >
                Nome do Turno *
              </label>
              <Input
                id="shift-name"
                type="text"
                placeholder="ex: 1º Turno (Manhã)"
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

            {/* Grid de Horários */}
            <div className="grid grid-cols-2 gap-4">
              {/* Horário de Início */}
              <div className="space-y-1.5">
                <label
                  htmlFor="shift-start-time"
                  className="text-sm font-medium text-foreground"
                >
                  Horário Início *
                </label>
                <Input
                  id="shift-start-time"
                  type="text"
                  placeholder="06:00"
                  maxLength={5}
                  autoComplete="off"
                  disabled={isSubmitting}
                  className={errors.startTime ? 'border-destructive focus-visible:ring-destructive' : ''}
                  {...register('startTime')}
                />
                {errors.startTime && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
              </div>

              {/* Horário de Término */}
              <div className="space-y-1.5">
                <label
                  htmlFor="shift-end-time"
                  className="text-sm font-medium text-foreground"
                >
                  Horário Término *
                </label>
                <Input
                  id="shift-end-time"
                  type="text"
                  placeholder="14:00"
                  maxLength={5}
                  autoComplete="off"
                  disabled={isSubmitting}
                  className={errors.endTime ? 'border-destructive focus-visible:ring-destructive' : ''}
                  {...register('endTime')}
                />
                {errors.endTime && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            {/* Duração Prevista Calculada */}
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <span className="font-semibold text-muted-foreground">
                Duração Prevista calculada:
              </span>{' '}
              <span className="font-mono font-bold text-foreground">
                {durationPreview}
              </span>
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
                'Cadastrar Turno'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
export default ShiftSheet;
