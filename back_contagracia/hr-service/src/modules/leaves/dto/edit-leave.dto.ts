import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsDateString } from 'class-validator';

export class EditLeaveDto {
  @ApiProperty({ description: 'Tipo de ausencia', required: false })
  @IsOptional()
  @IsString()
  leave_type?: string;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ description: 'Fecha de fin (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ description: 'Dias solicitados', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  days_requested?: number;

  @ApiProperty({ description: 'Razon o motivo', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Notas del administrador', required: false })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

export class RejectLeaveDto {
  @ApiProperty({ description: 'Razon del rechazo' })
  @IsString()
  rejection_reason: string;
}

export class ApproveLeaveDto {
  @ApiProperty({ description: 'Notas del administrador', required: false })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}
