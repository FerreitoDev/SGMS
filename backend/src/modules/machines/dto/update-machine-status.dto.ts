import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { MachineStatus } from '@prisma/client';

export class UpdateMachineStatusDto {
  @IsOptional()
  @IsEnum(MachineStatus, { message: 'Status operacional inválido.' })
  status?: MachineStatus;

  @IsOptional()
  @IsBoolean({ message: 'Status de ativação deve ser booleano.' })
  isActive?: boolean;
}
