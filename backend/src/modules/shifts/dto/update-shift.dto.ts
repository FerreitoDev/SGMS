import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsString({ message: 'O nome do turno deve ser texto.' })
  @IsNotEmpty({ message: 'O nome do turno não pode ser vazio.' })
  @MaxLength(60, { message: 'O nome do turno deve ter no máximo 60 caracteres.' })
  name?: string;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de início deve estar no formato HH:mm.',
  })
  startTime?: string;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de término deve estar no formato HH:mm.',
  })
  endTime?: string;

  @IsOptional()
  @IsBoolean({ message: 'Status de ativação deve ser booleano.' })
  isActive?: boolean;
}
