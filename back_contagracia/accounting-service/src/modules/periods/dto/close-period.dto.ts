import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClosePeriodDto {
  @ApiProperty({ description: 'Razón del cierre', example: 'Cierre fiscal 2025' })
  @IsString()
  @IsNotEmpty({ message: 'La razón es requerida' })
  reason: string;

  @ApiProperty({ description: 'Código de cuenta de cierre (utilidad del ejercicio)', example: '360505' })
  @IsString()
  @IsNotEmpty({ message: 'La cuenta de cierre es requerida' })
  closingAccountCode: string;

  @ApiProperty({ description: 'Código de cuenta de apertura (resultados anteriores)', example: '37050501' })
  @IsString()
  @IsNotEmpty({ message: 'La cuenta de apertura es requerida' })
  openingAccountCode: string;
}
