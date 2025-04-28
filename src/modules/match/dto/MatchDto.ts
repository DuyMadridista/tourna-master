import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TypeMatch } from 'src/enums/match-type.enum';
import { Team } from '../../team/entities/team.entity';
import { LocalTime } from '@js-joda/core';
export class MatchDto {
  id: number;

  @IsNotEmpty()
  teamOne: Team;

  @IsNotEmpty()
  teamTwo: Team;

  @IsOptional()
  @IsInt()
  teamOneResult?: number;

  @IsOptional()
  @IsInt()
  teamTwoResult?: number;

  @IsOptional()
  @Type(() => LocalTime)
  startTime?: LocalTime;

  @IsOptional()
  @Type(() => LocalTime)
  endTime?: LocalTime;

  @IsNotEmpty()
  @IsInt()
  eventDateId: number;

  @IsNotEmpty()
  @IsInt()
  slotId: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsNotEmpty()
  type: TypeMatch;

  @IsNotEmpty()
  @IsInt()
  timeDuration: number;

  group ?:string;

  constructor(partial?: Partial<MatchDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
