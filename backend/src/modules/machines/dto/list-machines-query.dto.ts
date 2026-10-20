import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { MachineStatus } from '@prisma/client';

export class ListMachinesQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O parâmetro isActive deve ser booleano.' })
  isActive?: boolean;

  @IsOptional()
  @IsEnum(MachineStatus, { message: 'Status operacional inválido no filtro.' })
  status?: MachineStatus;
}
