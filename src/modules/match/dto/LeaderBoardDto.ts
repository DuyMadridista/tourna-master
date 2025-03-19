export class LeaderBoardDto {
  teamId: number;
  teamName: string;
  score: number;
  theDifference: number;
  totalResult: number;
  rank: number;

  constructor(partial: Partial<LeaderBoardDto>) {
    Object.assign(this, partial);
  }
}
