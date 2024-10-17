import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [CustomerController],
  imports: [NatsModule],
})
export class CustomerModule {}
