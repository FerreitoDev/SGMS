import { IsInt, IsISO8601, IsUUID } from 'class-validator';

export class CreateProductionDto {
  @IsUUID('4', { message: 'clientUuid deve ser um UUID v4 válido.' })
  clientUuid!: string;

  @IsUUID('4', { message: 'allocationId deve ser um UUID válido.' })
  allocationId!: string;

  @IsInt({ message: 'Quantidade deve ser um número inteiro.' })
  quantity!: number;

  @IsISO8601({ strict: true }, { message: 'Timestamp deve ser uma data ISO 8601 válida.' })
  timestamp!: string;
}
