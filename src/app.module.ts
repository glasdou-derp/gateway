import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [RedisModule, AuthModule, UsersModule],
})
export class AppModule {}
