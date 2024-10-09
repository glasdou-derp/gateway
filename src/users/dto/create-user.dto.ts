import { IsEmail, IsEnum, IsOptional, IsString, IsStrongPassword, MinLength } from 'class-validator';
import { Role } from '../interfaces';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  username: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @IsStrongPassword()
  password: string;

  @IsEnum(Role, { each: true })
  @IsOptional()
  roles: Role[] = [Role.User];
}
