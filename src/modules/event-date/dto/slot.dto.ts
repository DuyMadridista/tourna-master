import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LocalTime } from '@js-joda/core';
import { MatchDto } from 'src/modules/match/dto/MatchDto';
export class SlotDTO {
  id: number;

  @IsOptional()
  slotIndex?: number;

  @IsOptional()
  fieldIndex?: number;

  @IsOptional()
  @Type(() => LocalTime)
  startTime?: LocalTime;

  @IsOptional()
  @Type(() => LocalTime)
  endTime?: LocalTime;

  @IsNotEmpty()
  @IsInt()
  eventDateId: number;
  
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MatchDto)
  matches?: MatchDto;


  constructor(partial?: Partial<SlotDTO>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
