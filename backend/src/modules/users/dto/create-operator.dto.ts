import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateOperatorDto {
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  @IsString({ message: 'Nome deve ser texto.' })
  name!: string;

  @IsNotEmpty({ message: 'Login é obrigatório.' })
  @IsString({ message: 'Login deve ser texto.' })
  username!: string;

  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  password!: string;
}
