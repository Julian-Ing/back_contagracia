import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class ManageSubscriptionDto {
  @ApiProperty({
    description: 'ID del plan a asignar',
    example: 'uuid-plan',
  })
  @IsString()
  plan_id: string;

  @ApiProperty({
    description: 'Fecha de vencimiento de la suscripción',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsDateString()
  ends_at: string;

  @ApiPropertyOptional({
    description: 'Usuarios adicionales sobre el límite del plan',
    example: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  user_plus?: number;
}
