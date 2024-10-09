import { ObjectManipulator } from 'src/helpers';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, tap } from 'rxjs';
import { Auth, User } from 'src/auth/decorators';
import { CurrentUser, Role } from 'src/auth/interfaces';
import { PaginationDto } from 'src/common';
import { envs, NATS_SERVICE } from 'src/config';
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

  @Post()
  @Auth(Role.Admin)
  create(@Body() createUserDto: CreateUserDto, @User() currentUser: CurrentUser) {
    return this.client.send('users.create', { ...createUserDto, createdBy: currentUser.id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (newUser) => {
        // Update cache with the new user data
        await this.cacheManager.set(`user:${newUser.id}`, newUser, envs.cacheTtl);
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

    return this.client.send('users.findAll', { paginationDto, user }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (users) => await this.cacheManager.set(cacheKey, users, envs.cacheTtl)),
    );
  }

  @Get(':id')
  @Auth(Role.Admin, Role.Moderator)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const cacheKey = `user:${id}`;
    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser) return cachedUser;

    return this.client.send('users.find.id', { id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Get('username/:username')
  @Auth(Role.Admin, Role.Moderator)
  async findByUsername(@Param('username') username: string) {
    const cacheKey = `user:${username}`;
    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser) return cachedUser;

    return this.client.send('users.find.username', { username }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Get('email/:email')
  @Auth(Role.Admin, Role.Moderator)
  async findByEmail(@Param('email') email: string) {
    const cacheKey = `user:${email}`;
    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser) return cachedUser;

    return this.client.send('users.find.email', { email }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Get('meta/:id')
  @Auth(Role.Admin, Role.Moderator)
  async findMeta(@Param('id', ParseUUIDPipe) id: string) {
    const cacheKey = `user:meta:${id}`;
    const cachedMeta = await this.cacheManager.get(cacheKey);

    if (cachedMeta) return cachedMeta;

    return this.client.send('users.find.meta', { id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Get('summary/:id')
  @Auth(Role.Admin, Role.Moderator)
  async findSummary(@Param('id', ParseUUIDPipe) id: string) {
    const cacheKey = `user:summary:${id}`;
    const cachedMeta = await this.cacheManager.get(cacheKey);

    if (cachedMeta) return cachedMeta;

    return this.client.send('users.find.summary', { id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),

      tap(async (user) => await this.cacheManager.set(cacheKey, user, envs.cacheTtl)),
    );
  }

  @Patch()
  @Auth(Role.Admin, Role.Moderator)
  async update(@Body() updateUserDto: UpdateUserDto) {
    const existingUser = await firstValueFrom(this.client.send('users.find.id', { id: updateUserDto.id }));

    return this.client.send('users.update', updateUserDto).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();

        // Invalidate cache if username or email has changed to prevent stale data
        existingUser.username !== updateUserDto.username || existingUser.email !== updateUserDto.email
          ? await this.invalidateUserCache(existingUser)
          : await this.invalidateUserCache(user);

        // Update cache with the new user data
        await this.setNewUserCache(user);
      }),
    );
  }

  @Delete(':id')
  @Auth(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.client.send('users.remove', { id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.invalidateUserCache(user);
        await this.setNewUserCache(user);
      }),
    );
  }

  @Patch('restore/:id')
  @Auth(Role.Admin, Role.Moderator)
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.client.send('users.restore', { id }).pipe(
      catchError((error) => {
        throw new RpcException(error);
      }),
      tap(async (user: CurrentUser) => {
        await this.invalidateUserListCache();
        await this.invalidateUserCache(user);
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
    const user = ObjectManipulator.exclude(newUser, ['password']);

    await this.cacheManager.set(`user:${user.id}`, user, envs.cacheTtl);
    await this.cacheManager.set(`user:${user.username}`, user, envs.cacheTtl);
    await this.cacheManager.set(`user:${user.email}`, user, envs.cacheTtl);
  }
}
