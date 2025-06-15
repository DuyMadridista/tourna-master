import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { UserRole } from 'src/enums/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async validateGoogleUser(googleUser: any) {
  let user = await this.userService.findUserByEmail(googleUser.email);
  if (!user) {
    user = await this.userService.createOrganizer({
      email: googleUser.email,
      firstName: googleUser.fullName.split(' ')[0],
      lastName: googleUser.fullName.split(' ').slice(1).join(' '),
      phoneNumber: '',
      dateOfBirth: null,
      password: null,
      role: UserRole.USER,
      createdAt: new Date(),
    });
  }

  const { password, ...result } = user;
  return result;
}
}
