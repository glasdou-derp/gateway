import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Body, Controller, Delete, Get, Inject, Logger, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, tap } from 'rxjs';

import { Auth, User } from 'src/auth/decorators';
import { CurrentUser, Role } from 'src/auth/interfaces';
import { PaginationDto } from 'src/common';
import { NATS_SERVICE } from 'src/config';
import { ObjectManipulator } from 'src/helpers';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('user')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get('health')
  health() {
    return this.client.send('user.health', {}).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
    );
  }

  @Get('clear_cache')
  @Auth(Role.Admin)
  async clearCache() {
    await this.cacheManager.reset();
    return { message: 'Cache cleared' };
  }

  @Post()
  @Auth(Role.Admin)
  create(@Body() createUserDto: CreateUserDto, @User() currentUser: CurrentUser) {
    return this.client.send('user.create', { ...createUserDto, createdById: currentUser.id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (newUser) => {
        await this.setNewUserCache(newUser);
        // Invalidate user list cache
        await this.invalidateUserListCache();
      }),
    );
  }

  @Get()
  @Auth(Role.Admin, Role.Moderator)
  async findAll(@Query() paginationDto: PaginationDto, @User() user: CurrentUser) {
    this.logger.log(`Fetching users: ${JSON.stringify(paginationDto)}, user: ${user.id} - ${user.username}`);
    const cacheKey = this.getUserListCacheKey(paginationDto);
    const cachedUsers = await this.cacheManager.get(cacheKey);

    if (cachedUsers) {
      this.logger.log(`Returning cached response for: ${JSON.stringify(paginationDto)}, user: ${user.id} - ${user.username}`);
      return cachedUsers;
    }

    return this.client.send('user.all', { paginationDto, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (users) => await this.cacheManager.set(cacheKey, users)),
    );
  }

  @Get(':id')
  @Auth(Role.Admin, Role.Moderator)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    this.logger.log(`Fetching user: ${id}, user: ${user.id} - ${user.username}`);
    const cacheKey = `user:${id}`;
    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser) {
      this.logger.log(`Returning cached user for: ${id}, user: ${user.id} - ${user.username}`);
      return cachedUser;
    }

    return this.client.send('user.find.id', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user)),
    );
  }

  @Get('username/:username')
  @Auth(Role.Admin, Role.Moderator)
  async findByUsername(@Param('username') username: string, @User() user: CurrentUser) {
    this.logger.log(`Fetching user: ${username}, user: ${user.id} - ${user.username}`);
    const cacheKey = `user:${username}`;
    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser) {
      this.logger.log(`Returning cached user for: ${username}, user: ${user.id} - ${user.username}`);
      return cachedUser;
    }

    return this.client.send('user.find.username', { username, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user)),
    );
  }

  @Get(':id/summary')
  @Auth(Role.Admin, Role.Moderator)
  async findSummary(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    this.logger.log(`Fetching user summary: ${id}, user: ${user.id} - ${user.username}`);
    const cacheKey = `user:summary:${id}`;
    const cachedMeta = await this.cacheManager.get(cacheKey);

    if (cachedMeta) {
      this.logger.log(`Returning cached user summary for: ${id}, user: ${user.id} - ${user.username}`);
      return cachedMeta;
    }

    return this.client.send('user.find.summary', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user)),
    );
  }

  @Patch(':id')
  @Auth(Role.Admin, Role.Moderator)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto, @User() user: CurrentUser) {
    return this.client.send('user.update', { updateUserDto: { ...updateUserDto, id }, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.setNewUserCache(user);
      }),
    );
  }

  @Delete(':id')
  @Auth(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    return this.client.send('user.remove', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.setNewUserCache(user);
      }),
    );
  }

  @Patch(':id/restore')
  @Auth(Role.Admin, Role.Moderator)
  restore(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    return this.client.send('user.restore', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.setNewUserCache(user);
      }),
    );
  }

  private getUserListCacheKey(paginationDto: PaginationDto): string {
    return `users:page:${paginationDto.page}:limit:${paginationDto.limit}`;
  }

  private async invalidateUserListCache() {
    // Implement a strategy to invalidate user list cache.
    // This could be a loop through known pagination keys if predictable or a naming convention.
    const keys = await this.cacheManager.store.keys(`users:*`);
    for (const key of keys) await this.cacheManager.del(key);
  }

  private async invalidateUserCache(user: CurrentUser) {
    await this.cacheManager.del(`user:${user.id}`);
    await this.cacheManager.del(`user:meta:${user.id}`);
    await this.cacheManager.del(`user:summary:${user.id}`);

    await this.cacheManager.del(`user:${user.username}`);
    await this.cacheManager.del(`user:${user.email}`);
  }

  private async setNewUserCache(newUser: CurrentUser) {
    await this.invalidateUserCache(newUser);
    const user = ObjectManipulator.exclude(newUser, ['password']);

    await this.cacheManager.set(`user:${user.id}`, user);
    await this.cacheManager.set(`user:${user.username}`, user);
  }
}
