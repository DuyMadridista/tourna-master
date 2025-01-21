import { IsInt, IsString, IsOptional, IsDateString } from 'class-validator';

export class MatchOfLeaderBoardDto {
  @IsInt()
  matchId: number;

  @IsInt()
  teamOneId: number;

  @IsString()
  teamOneName: string;

  @IsInt()
  teamTwoId: number;

  @IsString()
  teamTwoName: string;

  @IsInt()
  teamOneResult: number;

  @IsInt()
  teamTwoResult: number;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string; 

  @IsString()
  endTime: string; 

  @IsOptional()
  @IsInt()
  teamWinId?: number;
}
