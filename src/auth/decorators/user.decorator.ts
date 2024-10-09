import { ExecutionContext, InternalServerErrorException, createParamDecorator } from '@nestjs/common';
import { ObjectManipulator } from 'src/helpers';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  if (!request.user) throw new InternalServerErrorException('User not found in request (AuthGuard is used?)');

  ObjectManipulator.safeDelete(request.user, 'password');

  return request.user;
});
