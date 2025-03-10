// auth/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserProvider } from 'src/helper/current-user.provider';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly currentUserProvider: CurrentUserProvider) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    if (user) {
      const request = context.switchToHttp().getRequest();
      this.currentUserProvider.setUser(user);
    }
    return user;
  }
}
