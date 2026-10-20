import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListShiftsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O parâmetro isActive deve ser booleano.' })
  isActive?: boolean;
}
