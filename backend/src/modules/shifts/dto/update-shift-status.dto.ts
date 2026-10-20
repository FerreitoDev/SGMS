import { IsBoolean } from 'class-validator';

export class UpdateShiftStatusDto {
  @IsBoolean({ message: 'Status de ativação deve ser booleano.' })
  isActive!: boolean;
}
