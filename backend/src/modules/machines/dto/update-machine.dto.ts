import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MachineStatus } from '@prisma/client';

export class UpdateMachineDto {
  @IsOptional()
  @IsString({ message: 'O código identificador deve ser texto.' })
  @IsNotEmpty({ message: 'O código identificador não pode ser vazio.' })
  @MaxLength(30, { message: 'O código identificador deve ter no máximo 30 caracteres.' })
  code?: string;

  @IsOptional()
  @IsString({ message: 'O nome da sopradora deve ser texto.' })
  @IsNotEmpty({ message: 'O nome da sopradora não pode ser vazio.' })
  @MaxLength(100, { message: 'O nome da sopradora deve ter no máximo 100 caracteres.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'O modelo da sopradora deve ser texto.' })
  @MaxLength(100, { message: 'O modelo da sopradora deve ter no máximo 100 caracteres.' })
  model?: string;

  @IsOptional()
  @IsEnum(MachineStatus, { message: 'Status operacional inválido.' })
  status?: MachineStatus;

  @IsOptional()
  @IsBoolean({ message: 'Status de ativação deve ser booleano.' })
  isActive?: boolean;
}
