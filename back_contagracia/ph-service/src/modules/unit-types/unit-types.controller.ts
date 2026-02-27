import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { UnitTypesService } from './unit-types.service';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';

@ApiTags('PH Unit Types')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/unit-types')
export class UnitTypesController {
  constructor(private readonly unitTypesService: UnitTypesService) {}

  /**
   * Permission: ph.settings.view
   * Listar tipos de unidad
   */
  @Get()
  @ApiOperation({ summary: 'Listar tipos de unidad' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o código' })
  @ApiQuery({ name: 'is_active', required: false, description: 'Filtrar por estado activo' })
  @ApiQuery({ name: 'skip', required: false, description: 'Registros a saltar (paginación)' })
  @ApiQuery({ name: 'take', required: false, description: 'Registros a tomar (paginación)' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.unitTypesService.findAll(companyId, {
      search,
      is_active,
      skip,
      take,
    });
  }

  /**
   * Permission: ph.settings.view
   * Obtener tipo de unidad por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de unidad por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.unitTypesService.findOne(companyId, id);
  }

  /**
   * Permission: ph.settings.edit
   * Crear tipo de unidad
   */
  @Post()
  @ApiOperation({ summary: 'Crear tipo de unidad' })
  @Audit('unit_type.created', 'unit_type')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateUnitTypeDto,
  ) {
    return this.unitTypesService.create(companyId, dto);
  }

  /**
   * Permission: ph.settings.edit
   * Actualizar tipo de unidad
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar tipo de unidad' })
  @Audit('unit_type.updated', 'unit_type')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitTypeDto,
  ) {
    return this.unitTypesService.update(companyId, id, dto);
  }

  /**
   * Permission: ph.settings.edit
   * Eliminar tipo de unidad (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tipo de unidad (soft delete)' })
  @Audit('unit_type.deleted', 'unit_type')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.unitTypesService.remove(companyId, id);
  }
}
