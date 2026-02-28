import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@ApiTags('PH Units')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /**
   * Permission: ph.units.view
   * Listar unidades con filtros y paginacion
   */
  @Get()
  @ApiOperation({ summary: 'Listar unidades con filtros y paginacion' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'tower_id', required: false })
  @ApiQuery({ name: 'unit_type_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query('condominium_id') condominiumId?: string,
    @Query('tower_id') towerId?: string,
    @Query('unit_type_id') unitTypeId?: string,
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.unitsService.findAll(companyId, {
      condominium_id: condominiumId,
      tower_id: towerId,
      unit_type_id: unitTypeId,
      search,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      userId: req.user?.sub,
      userRole: req.user?.role_key || req.user?.role,
    });
  }

  /**
   * Permission: ph.units.view
   * Suma de coeficientes de una copropiedad
   */
  @Get('coefficient-sum')
  @ApiOperation({ summary: 'Suma de coeficientes por copropiedad' })
  @ApiQuery({ name: 'condominium_id', required: true })
  @ApiQuery({ name: 'exclude_unit_id', required: false })
  async getCoefficientSum(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId: string,
    @Query('exclude_unit_id') excludeUnitId?: string,
  ) {
    return this.unitsService.getCoefficientSum(companyId, condominiumId, excludeUnitId);
  }

  /**
   * Permission: ph.units.view
   * Historial de cambios de una unidad
   */
  @Get(':id/history')
  @ApiOperation({ summary: 'Historial de cambios de una unidad' })
  async getHistory(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.unitsService.getHistory(companyId, id);
  }

  /**
   * Permission: ph.units.edit
   * Eliminar un registro del historial de cambios
   */
  @Delete(':id/history/:historyId')
  @ApiOperation({ summary: 'Eliminar registro de historial' })
  async deleteHistoryEntry(
    @Param('companyId') companyId: string,
    @Param('historyId') historyId: string,
  ) {
    return this.unitsService.deleteHistoryEntry(companyId, historyId);
  }

  /**
   * Permission: ph.units.view
   * Obtener una unidad por ID con todas sus relaciones
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener unidad por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.unitsService.findOne(companyId, id);
  }

  /**
   * Permission: ph.units.create
   * Crear una nueva unidad
   */
  @Post()
  @ApiOperation({ summary: 'Crear unidad' })
  @Audit('unit.created', 'unit')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateUnitDto,
    @Request() req: any,
  ) {
    return this.unitsService.create(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.units.edit
   * Actualizar una unidad existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar unidad' })
  @Audit('unit.updated', 'unit')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
    @Request() req: any,
  ) {
    // Capturar datos anteriores antes de actualizar
    const current = await this.unitsService.findOne(companyId, id);

    const result = await this.unitsService.update(companyId, id, dto);

    // Registrar cambio de nombre si cambió
    if (dto.unit_number && dto.unit_number !== current.unit_number) {
      this.unitsService.logNameChange(
        companyId, id, current.unit_number, dto.unit_number,
        req.user?.sub, req.user?.email,
      );
    }

    // Registrar cambio de copropiedad si cambió
    if (dto.condominium_id && dto.condominium_id !== current.condominium_id) {
      this.unitsService.logCondominiumChange(
        companyId, id,
        current.condominium_id, dto.condominium_id,
        current.condominium?.name || 'Desconocida',
        result.condominium?.name || 'Desconocida',
        req.user?.sub, req.user?.email,
      );
    }

    return result;
  }

  /**
   * Permission: ph.units.delete
   * Eliminar una unidad (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar unidad (soft delete)' })
  @Audit('unit.deleted', 'unit')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.unitsService.remove(companyId, id);
  }
}
