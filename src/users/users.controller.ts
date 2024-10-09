import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, tap } from 'rxjs';
import { Auth, User } from 'src/auth/decorators';
import { CurrentUser, Role } from 'src/auth/interfaces';
import { PaginationDto } from 'src/common';
import { envs, NATS_SERVICE } from 'src/config';
import { ObjectManipulator } from 'src/helpers';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get('health')
  health() {
    return this.client.send('users.health', {}).pipe(
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
    return this.client.send('users.create', { ...createUserDto, createdById: currentUser.id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (newUser) => {
        // Update cache with the new user data
        await this.setNewUserCache(newUser);
        // Invalidate user list cache
        await this.invalidateUserListCache();
      }),
    );
  }

  @Get()
  @Auth(Role.Admin, Role.Moderator)
  async findAll(@Query() paginationDto: PaginationDto, @User() user: CurrentUser) {
    const cacheKey = this.getUserListCacheKey(paginationDto);
    const cachedUsers = await this.cacheManager.get(cacheKey);

    if (cachedUsers) return cachedUsers;

    return this.client.send('users.all', { paginationDto, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (users) => await this.cacheManager.set(cacheKey, users, envs.cacheTtl)),
    );
  }

  @Get(':id')
  @Auth(Role.Admin, Role.Moderator)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    const cacheKey = `user:${id}`;
    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser) return cachedUser;

    return this.client.send('users.find.id', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Get('username/:username')
  @Auth(Role.Admin, Role.Moderator)
  async findByUsername(@Param('username') username: string, @User() user: CurrentUser) {
    const cacheKey = `user:${username}`;
    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser) return cachedUser;

    return this.client.send('users.find.username', { username, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Get(':id/meta')
  @Auth(Role.Admin, Role.Moderator)
  async findMeta(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    const cacheKey = `user:meta:${id}`;
    const cachedMeta = await this.cacheManager.get(cacheKey);

    if (cachedMeta) return cachedMeta;

    return this.client.send('users.find.meta', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Get(':id/summary')
  @Auth(Role.Admin, Role.Moderator)
  async findSummary(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    const cacheKey = `user:summary:${id}`;
    const cachedMeta = await this.cacheManager.get(cacheKey);

    if (cachedMeta) return cachedMeta;

    return this.client.send('users.find.summary', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Patch(':id')
  @Auth(Role.Admin, Role.Moderator)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto, @User() user: CurrentUser) {
    return this.client.send('users.update', { updateUserDto: { ...updateUserDto, id }, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.invalidateUserCache(user);
      }),
    );
  }

  @Delete(':id')
  @Auth(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    return this.client.send('users.remove', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.invalidateUserCache(user);
      }),
    );
  }

  @Patch(':id/restore')
  @Auth(Role.Admin, Role.Moderator)
  restore(@Param('id', ParseUUIDPipe) id: string, @User() user: CurrentUser) {
    return this.client.send('users.restore', { id, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.invalidateUserCache(user);
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

    await this.cacheManager.set(`user:${user.id}`, user, envs.cacheTtl);
    await this.cacheManager.set(`user:${user.username}`, user, envs.cacheTtl);
  }
}
