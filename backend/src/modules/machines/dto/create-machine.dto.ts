import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMachineDto {
  @IsNotEmpty({ message: 'O código identificador é obrigatório.' })
  @IsString({ message: 'O código identificador deve ser texto.' })
  @MaxLength(30, { message: 'O código identificador deve ter no máximo 30 caracteres.' })
  code!: string;

  @IsNotEmpty({ message: 'O nome da sopradora é obrigatório.' })
  @IsString({ message: 'O nome da sopradora deve ser texto.' })
  @MaxLength(100, { message: 'O nome da sopradora deve ter no máximo 100 caracteres.' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'O modelo da sopradora deve ser texto.' })
  @MaxLength(100, { message: 'O modelo da sopradora deve ter no máximo 100 caracteres.' })
  model?: string;
}
