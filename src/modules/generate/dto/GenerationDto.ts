import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { MatchDto } from '../../match/dto/MatchDto';
import { LocalTime, LocalDate } from '@js-joda/core';

export class GenerationDto {
  @IsNotEmpty()
  @IsInt()
  eventDateId: number;

  @IsNotEmpty()
  @Type(() => LocalTime)
  startTime: LocalTime;

  @IsNotEmpty()
  @Type(() => LocalTime)
  endTime: LocalTime;

  @IsNotEmpty()
  @Type(() => LocalDate)
  date: LocalDate;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MatchDto)
  matches?: MatchDto[];

  constructor(partial?: Partial<GenerationDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
