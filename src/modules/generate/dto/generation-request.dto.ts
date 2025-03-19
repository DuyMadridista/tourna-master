import { IsInt, Min, Validate } from 'class-validator';
import { LocalTime } from '@js-joda/core';
import { Type } from 'class-transformer';

export class GenerationRequestDto {
  @IsInt()
  @Min(1, { message: 'Duration must be at least 1' })
  duration: number;

  @IsInt()
  @Min(0, { message: 'Between time must be at least 0' })
  betweenTime: number;

  startTime: LocalTime;

  endTime: LocalTime;
}
