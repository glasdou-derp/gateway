import { Transform, Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty()
  @MinLength(3)
  @Type(() => String)
  @Transform(({ value }) => value.trim().toUpperCase())
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @Type(() => String)
  @Transform(({ value }) => value.trim().toLowerCase())
  email: string;
}
