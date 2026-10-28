import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Tolerância máxima de 2 minutos para desvio de relógio (clock drift)
 * entre o dispositivo móvel do operador e o servidor local.
 */
export const MAX_CLOCK_DRIFT_TOLERANCE_MS = 2 * 60 * 1000;

@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
export class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    if (!value) return true;
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    return date.getTime() <= Date.now() + MAX_CLOCK_DRIFT_TOLERANCE_MS;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} não pode estar no futuro (tolerância máxima de 2 minutos).`;
  }
}

/**
 * Decorator para class-validator que rejeita datas futuras no DTO.
 */
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotFutureDateConstraint,
    });
  };
}

/**
 * Validador de domínio canônico (RN-05):
 * Rejeita timestamps no futuro além da tolerância máxima de 2 minutos,
 * gerando erro RFC 7807 com HTTP 422 Unprocessable Entity.
 */
export function assertNotFutureDate(
  dateOrIso: string | Date,
  fieldLabel: string = 'O horário informado',
  toleranceMs: number = MAX_CLOCK_DRIFT_TOLERANCE_MS,
): Date {
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;

  if (isNaN(date.getTime())) {
    throw new BadRequestException({
      title: 'Requisição Inválida',
      message: `${fieldLabel} deve ser uma data e hora ISO 8601 válida.`,
      code: 'INVALID_TIMESTAMP',
    });
  }

  const now = new Date();
  if (date.getTime() > now.getTime() + toleranceMs) {
    throw new UnprocessableEntityException({
      title: 'Entidade Improcessável',
      message: `${fieldLabel} não pode estar no futuro (tolerância máxima de 2 minutos).`,
      code: 'FUTURE_TIMESTAMP',
    });
  }

  return date;
}

/**
 * Validação de consistência com a data do turno da alocação (RN-05):
 * O evento deve pertencer à janela operacional do turno (com margem de segurança
 * para cobrir turnos noturnos que viram a meia-noite e fechamentos pós-turno).
 */
export function assertShiftDateWindow(
  eventDate: Date,
  shiftDate: Date,
  fieldLabel: string = 'O evento',
  isAllocationActive: boolean = true,
): void {
  const shiftDay = new Date(shiftDate);
  shiftDay.setUTCHours(0, 0, 0, 0);

  // Janela: desde 2 horas antes da data base do turno até 36 horas após (cobrindo turnos noturnos de até 12h + tolerância).
  // Enquanto a alocação estiver com status ACTIVE, o limite superior acompanha o relógio atual para não rejeitar
  // apontamentos em tempo real em turnos abertos em dias anteriores (ex: dados de seed ou turnos prolongados).
  const windowStart = new Date(shiftDay.getTime() - 2 * 60 * 60 * 1000);
  const baseWindowEndMs = shiftDay.getTime() + 36 * 60 * 60 * 1000;
  const windowEnd = new Date(
    isAllocationActive
      ? Math.max(baseWindowEndMs, Date.now() + MAX_CLOCK_DRIFT_TOLERANCE_MS)
      : baseWindowEndMs,
  );

  if (eventDate.getTime() < windowStart.getTime() || eventDate.getTime() > windowEnd.getTime()) {
    throw new UnprocessableEntityException({
      title: 'Entidade Improcessável',
      message: `${fieldLabel} possui data incompatível com o turno da alocação informada.`,
      code: 'OUT_OF_SHIFT_WINDOW',
    });
  }
}
