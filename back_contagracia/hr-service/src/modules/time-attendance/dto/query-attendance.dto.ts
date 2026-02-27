import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsNumberString } from 'class-validator';

export class QueryAttendanceDto {
  @ApiPropertyOptional({ description: 'Filtrar por empleado' })
  @IsOptional()
  @IsUUID()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Pagina', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Registros por pagina', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
