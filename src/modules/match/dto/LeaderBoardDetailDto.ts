import { LeaderBoardDto } from './LeaderBoardDto';
import { MatchOfLeaderBoardDto } from './MatchOfLeaderBoardDto';

export class LeaderBoardDetailDto {
  leaderBoard: LeaderBoardDto[];
  matches: MatchOfLeaderBoardDto[];
  topTeams?: LeaderBoardDto[];

  constructor(partial: Partial<LeaderBoardDetailDto>) {
    Object.assign(this, partial);
  }
}
