import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { NatsModule } from 'src/transports/nats.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  controllers: [UsersController],
  imports: [NatsModule, RedisModule],
})
export class UsersModule {}
