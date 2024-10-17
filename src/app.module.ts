import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/user.module';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [RedisModule, AuthModule, UsersModule, CustomerModule],
})
export class AppModule {}
