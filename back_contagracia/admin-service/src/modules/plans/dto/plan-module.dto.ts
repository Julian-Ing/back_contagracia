import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';

export class SetPlanModulesDto {
  @ApiProperty({
    description: 'Lista de IDs de módulos a asignar al plan',
    example: ['uuid-modulo-facturacion', 'uuid-modulo-inventario'],
  })
  @IsArray()
  @IsString({ each: true })
  module_ids: string[];
}

export class AddPlanModuleDto {
  @ApiProperty({
    description: 'ID del módulo a agregar',
    example: 'uuid-modulo-facturacion',
  })
  @IsString()
  module_id: string;
}
