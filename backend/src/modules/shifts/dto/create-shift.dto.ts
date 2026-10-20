import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateShiftDto {
  @IsNotEmpty({ message: 'O nome do turno é obrigatório.' })
  @IsString({ message: 'O nome do turno deve ser texto.' })
  @MaxLength(60, { message: 'O nome do turno deve ter no máximo 60 caracteres.' })
  name!: string;

  @IsNotEmpty({ message: 'O horário de início é obrigatório.' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de início deve estar no formato HH:mm.',
  })
  startTime!: string;

  @IsNotEmpty({ message: 'O horário de término é obrigatório.' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de término deve estar no formato HH:mm.',
  })
  endTime!: string;
}
