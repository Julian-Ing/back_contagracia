import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class StagePositionDto {
  @ApiProperty({ description: 'ID de la etapa' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nueva posición' })
  @IsInt()
  position: number;
}

export class ReorderStagesDto {
  @ApiProperty({ description: 'Lista de etapas con sus nuevas posiciones', type: [StagePositionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StagePositionDto)
  stages: StagePositionDto[];
}
