import { IsNotEmpty, IsString, IsDate, IsPhoneNumber } from 'class-validator';

export class PlayerRequestDto {
  @IsNotEmpty()
  @IsString()
  playerName: string;

  @IsNotEmpty()
  number: number;

  @IsNotEmpty()
  @IsDate()
  dateOfBirth: Date;

  @IsNotEmpty()
  @IsPhoneNumber(null)
  phone: string;
}
