import { IsInt, IsNumber } from 'class-validator';

export class GenerationUpdateRequestDto {
  @IsInt()
  eventDateIdSelected: number;

  @IsNumber()
  matchOfNewTimeId: number;

  @IsNumber()
  matchId: number;
}
