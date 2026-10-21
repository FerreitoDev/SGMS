import {
  IsArray,
  IsEnum,
  IsObject,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SyncEventType {
  PRODUCTION = 'PRODUCTION',
  DOWNTIME = 'DOWNTIME',
}

export class SyncEventItemDto {
  @IsUUID('4', { message: 'clientUuid deve ser um UUID v4 válido.' })
  clientUuid!: string;

  @IsEnum(SyncEventType, {
    message: 'Tipo de evento inválido. Valores aceitos: PRODUCTION, DOWNTIME.',
  })
  type!: SyncEventType;

  @IsObject({ message: 'Payload do evento deve ser um objeto.' })
  payload!: Record<string, any>;
}

export class SyncBatchDto {
  @IsArray({ message: 'events deve ser um array.' })
  @ValidateNested({ each: true })
  @Type(() => SyncEventItemDto)
  events!: SyncEventItemDto[];
}
