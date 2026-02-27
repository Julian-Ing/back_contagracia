import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSwapRequestDto {
  @ApiProperty({ description: 'ID del empleado objetivo (con quien quiere intercambiar)' })
  @IsString()
  target_id: string;

  @ApiProperty({ description: 'ID de mi asignación de turno' })
  @IsString()
  requester_assignment_id: string;

  @ApiProperty({ description: 'ID de la asignación del turno objetivo' })
  @IsString()
  target_assignment_id: string;

  @ApiPropertyOptional({ description: 'Razón del intercambio' })
  @IsOptional()
  @IsString()
  reason?: string;
}
