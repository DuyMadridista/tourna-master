import { UserRole } from 'src/enums/user-role.enum';
import { User } from 'src/modules/user/entities/user.entity';

export class UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }

  static toUserDto(user: User): UserDto {
    return new UserDto({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  }
}
