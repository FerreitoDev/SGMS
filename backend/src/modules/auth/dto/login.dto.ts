import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'O login é obrigatório.' })
  @IsString({ message: 'O login deve ser uma string.' })
  username!: string;

  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @IsString({ message: 'A senha deve ser uma string.' })
  password!: string;
}
