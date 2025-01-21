import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class OrganizerTableDto {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsPhoneNumber(null)
  @IsOptional()
  phoneNumber?: string;

  @IsOptional()
  createdAt?: Date;

  @IsInt()
  @IsOptional()
  totalTournament?: number;

  @IsOptional()
  dateOfBirth?: Date;
}
