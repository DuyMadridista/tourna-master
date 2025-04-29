import { IsNotEmpty, IsString, IsDate, IsPhoneNumber } from 'class-validator';

export class PlayerRequestDto {
  @IsNotEmpty()
  @IsString()
  playerName: string;

  @IsNotEmpty()
  @IsDate()
  dateOfBirth: Date;

  @IsNotEmpty()
  @IsPhoneNumber(null)
  phone: string;

  @IsNotEmpty()
  number: number;
}
