import { IsISO8601, IsUUID } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID('4', { message: 'ID da máquina inválido.' })
  machineId!: string;

  @IsUUID('4', { message: 'ID do turno inválido.' })
  shiftId!: string;

  @IsISO8601({ strict: true }, { message: 'Data do turno deve estar no formato YYYY-MM-DD.' })
  shiftDate!: string;
}
