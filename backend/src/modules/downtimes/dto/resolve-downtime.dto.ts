import { IsISO8601 } from 'class-validator';

export class ResolveDowntimeDto {
  @IsISO8601({ strict: true }, { message: 'endTime deve ser uma data ISO 8601 válida.' })
  endTime!: string;
}
