import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { DowntimeReason } from '@prisma/client';

export class RetroactiveDowntimeDto {
  @IsUUID('4', { message: 'clientUuid deve ser um UUID v4 válido.' })
  clientUuid!: string;

  @IsUUID('4', { message: 'allocationId deve ser um UUID válido.' })
  allocationId!: string;

  @IsEnum(DowntimeReason, { message: 'Motivo de parada inválido.' })
  reason!: DowntimeReason;

  @IsOptional()
  @IsString({ message: 'A justificativa deve ser um texto.' })
  justification?: string;

  @IsISO8601({ strict: true }, { message: 'startTime deve ser uma data ISO 8601 válida.' })
  startTime!: string;

  @IsISO8601({ strict: true }, { message: 'endTime deve ser uma data ISO 8601 válida.' })
  endTime!: string;
}
