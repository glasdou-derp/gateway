import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRoleGuard } from '../guards/user-role.guard';
import { Role } from '../interfaces';
import { Roles } from './role.decorator';
import { AuthGuard } from '../guards';

export function Auth(...roles: Role[]) {
  return applyDecorators(Roles(...roles), UseGuards(AuthGuard, UserRoleGuard));
}
