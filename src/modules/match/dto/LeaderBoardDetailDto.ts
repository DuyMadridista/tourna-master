import { LeaderBoardDto } from './LeaderBoardDto';
import { MatchOfLeaderBoardDto } from './MatchOfLeaderBoardDto';

export class LeaderBoardDetailDto {
  leaderBoard: LeaderBoardDto[];
  matches: MatchOfLeaderBoardDto[];

  constructor(partial: Partial<LeaderBoardDetailDto>) {
    Object.assign(this, partial);
  }
}
