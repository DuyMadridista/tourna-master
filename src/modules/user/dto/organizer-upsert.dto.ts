import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsEnum,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from 'src/enums/user-role.enum';

export class OrganizerUpSertDto {
  @IsOptional()
  id?: number;

  @IsEmail({}, { message: 'Email must be valid' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Email must be valid' })
  @IsNotEmpty({ message: 'Email must not be empty' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'First name must not be empty' })
  @Matches(/^[a-zA-Z]+$/, { message: 'First name must be alphabetic' })
  @MaxLength(30, { message: 'First name must be maximum 30 characters' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name must not be empty' })
  @Matches(/^[a-zA-Z]+$/, { message: 'Last name must be alphabetic' })
  @MaxLength(30, { message: 'Last name must be maximum 30 characters' })
  lastName: string;

  @IsPhoneNumber(null, { message: 'Phone number must be valid' })
  @IsNotEmpty({ message: 'Phone number must not be empty' })
  phoneNumber: string;

  @IsOptional()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  role?: UserRole;

  @IsOptional()
  @Type(() => Date)
  createdAt?: Date;

  @IsOptional()
  @IsString()
  password?: string;


  /**
   * Static method to map a User entity to OrganizerUpSertDto.
   */
  static fromUser(user: any): OrganizerUpSertDto {
    const dto = new OrganizerUpSertDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.phoneNumber = user.phoneNumber;
    dto.dateOfBirth = user.dateOfBirth;
    dto.role = user.role;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
