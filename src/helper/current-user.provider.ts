import { Injectable, Scope } from '@nestjs/common';
import { Request } from 'express';
import { User } from 'src/modules/user/entities/user.entity';

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserProvider {
  private user: User | null = null;

  setUser(user: User) {
    this.user = user;
  }

  getUser(): User {
    if (!this.user) {
      throw new Error('User is not set');
    }
    return this.user;
  }
}
