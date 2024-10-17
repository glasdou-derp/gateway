import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { Auth, CurrentUser, User } from 'src/auth';
import { PaginationDto, ParseCuidPipe } from 'src/common';
import { NATS_SERVICE } from 'src/config';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

@Controller('customer')
@Auth()
export class CustomerController {
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  @Get('health')
  health() {
    return 'Customer service is up and running!';
  }

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto, @User() user: CurrentUser) {
    return this.client.send('customer.create', { createCustomerDto, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
    );
  }

  @Get()
  findAll(@Query() pagination: PaginationDto, @User() user: CurrentUser) {
    return this.client.send('customer.all', { pagination, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseCuidPipe) id: string, @User() user: CurrentUser) {
    return this.client.send('customer.id', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
    );
  }

  @Patch(':id')
  update(@Param('id', ParseCuidPipe) id: string, @Body() updateCustomerDto: UpdateCustomerDto, @User() user: CurrentUser) {
    return this.client.send('customer.update', { updateCustomerDto: { ...updateCustomerDto, id }, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseCuidPipe) id: string, @User() user: CurrentUser) {
    return this.client.send('customer.remove', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
    );
  }

  @Patch(':id/restore')
  restore(@Param('id', ParseCuidPipe) id: string, @User() user: CurrentUser) {
    return this.client.send('customer.restore', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
    );
  }
}
