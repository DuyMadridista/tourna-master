import { IsDateString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MatchResultDto } from './MatchResultDto'; // Ensure the MatchResultDto is defined

export class ResultDto {
  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchResultDto)
  matches: MatchResultDto[];
}
