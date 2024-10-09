import { CanActivate, ExecutionContext, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

import { META_ROLES_KEY } from '../decorators';
import { CurrentUser, Role } from '../interfaces';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const validRoles = this.reflector.get<Role[]>(META_ROLES_KEY, context.getHandler());

    if (!validRoles || validRoles.length === 0) return true;

    const user: CurrentUser = context.switchToHttp().getRequest().user;

    if (!user) throw new InternalServerErrorException(`No user inside the request, make sure that we used the AuthGuard`);

    if (validRoles.some((r) => user.roles.includes(r))) return true;

    throw new ForbiddenException(`User ${user.username} need a valid role [${validRoles}]`);
  }
}
