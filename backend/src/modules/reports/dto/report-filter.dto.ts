import { IsISO8601, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ReportFilterDto {
  @IsNotEmpty({ message: 'Data inicial é obrigatória.' })
  @IsISO8601({ strict: false }, { message: 'Data inicial deve ser uma data ISO 8601 válida.' })
  startDate!: string;

  @IsNotEmpty({ message: 'Data final é obrigatória.' })
  @IsISO8601({ strict: false }, { message: 'Data final deve ser uma data ISO 8601 válida.' })
  endDate!: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID da máquina inválido.' })
  machineId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do turno inválido.' })
  shiftId?: string;
}
