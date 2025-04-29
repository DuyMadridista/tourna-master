import { IsInt } from 'class-validator';

export class RequestDragDropMatch {
  @IsInt()
  matchId: number;

  @IsInt()
  newEventDateId: number;

  @IsInt()
  newIndexOfMatch: number;
}
export class RequestDragDropMatch2 {
  @IsInt()
  matchId: number;

  @IsInt()
  newSlotId: number;
}

