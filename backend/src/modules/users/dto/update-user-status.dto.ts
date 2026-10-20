import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({ message: 'Status ativo deve ser um valor booleano.' })
  isActive!: boolean;
}
