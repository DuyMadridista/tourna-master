import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CurrentUserProvider } from 'src/helper/current-user.provider';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly currentUserProvider: CurrentUserProvider
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      this.currentUserProvider.setUser(user);
    }

    return !!user; 
  }
}
