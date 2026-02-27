import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAIConfigDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  active_provider?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gemini_model?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  openai_model?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  anthropic_model?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assistant_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assistant_role?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  greeting?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatar_emoji?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  detail_level?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  use_emojis?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  proactive_suggestions?: boolean;
}
