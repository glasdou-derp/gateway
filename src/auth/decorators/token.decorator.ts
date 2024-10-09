import { ExecutionContext, InternalServerErrorException, createParamDecorator } from '@nestjs/common';

export const Token = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  if (!request.token) throw new InternalServerErrorException('Token not found (AuthGuard is used?)');

  return request.token;
});
