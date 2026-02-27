import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsString()
  @IsOptional()
  phone?: string;
}
