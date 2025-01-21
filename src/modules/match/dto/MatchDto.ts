import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TypeMatch } from 'src/enums/match-type.enum';
import { Team } from '../../team/entities/team.entity'; 
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
  @Type(() => Date)
  startTime?: Date;

  @IsOptional()
  @Type(() => Date)
  endTime?: Date;

  @IsNotEmpty()
  @IsInt()
  eventDateId: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsNotEmpty()
  type: TypeMatch;

  @IsNotEmpty()
  @IsInt()
  timeDuration: number;

  constructor(partial: Partial<MatchDto>) {
    Object.assign(this, partial);
  }
}
