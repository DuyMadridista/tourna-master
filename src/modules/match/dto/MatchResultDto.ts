import {
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { TypeMatch } from 'src/enums/match-type.enum';

export class MatchResultDto {
  @IsInt()
  id: number;

  @IsInt()
  teamOneId: number;

  @IsString()
  teamOneName: string;

  @IsInt()
  teamOneResult: number;

  @IsInt()
  teamTwoId: number;

  @IsString()
  teamTwoName: string;

  @IsInt()
  teamTwoResult: number;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsInt()
  eventDateId: number;

  @IsString()
  title: string;

  @IsEnum(TypeMatch)
  type: TypeMatch;
}
