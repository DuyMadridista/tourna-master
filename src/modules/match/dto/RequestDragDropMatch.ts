import { IsInt } from 'class-validator';

export class RequestDragDropMatch {
  @IsInt()
  matchId: number;

  @IsInt()
  newEventDateId: number;

  @IsInt()
  newIndexOfMatch: number;
}
