import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordRequestDto {
  @IsNotEmpty({ message: 'Old password is required' })
  @IsString({ message: 'Old password must be a string' })
  oldPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;

  @IsNotEmpty({ message: 'Confirm password is required' })
  @IsString({ message: 'Confirm password must be a string' })
  confirmPassword: string;
}
