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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

@ApiTags('PH Residents')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  /**
   * Permission: ph.residents.view
   * Listar residentes con filtros y paginacion
   */
  @Get()
  @ApiOperation({ summary: 'Listar residentes con filtros y paginación' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'unit_id', required: false })
  @ApiQuery({ name: 'resident_type', required: false })
  @ApiQuery({ name: 'tercero_id', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query('condominium_id') condominiumId?: string,
    @Query('unit_id') unitId?: string,
    @Query('resident_type') residentType?: string,
    @Query('tercero_id') terceroId?: string,
    @Query('is_active') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.residentsService.findAll(companyId, {
      condominium_id: condominiumId,
      unit_id: unitId,
      resident_type: residentType,
      tercero_id: terceroId,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      userId: req.user?.sub,
      userRole: req.user?.role_key || req.user?.role,
      permissions: req.user?.permissions || [],
    });
  }

  /**
   * Obtener las unidades del usuario logueado (residente)
   * No requiere permiso especial — cualquier usuario autenticado puede consultar sus propias unidades
   */
  @Get('my-units')
  @ApiOperation({ summary: 'Obtener unidades del usuario logueado' })
  async getMyUnits(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    return this.residentsService.getMyUnits(companyId, req.user.sub);
  }

  /**
   * Permission: ph.residents.view
   * Historial de cambios de un residente
   */
  @Get(':id/history')
  @ApiOperation({ summary: 'Historial de cambios de un residente' })
  async getResidentHistory(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.residentsService.getResidentHistory(companyId, id);
  }

  /**
   * Permission: ph.residents.edit
   * Eliminar un registro del historial de cambios
   */
  @Delete(':id/history/:historyId')
  @ApiOperation({ summary: 'Eliminar registro de historial de residente' })
  async deleteResidentHistoryEntry(
    @Param('companyId') companyId: string,
    @Param('historyId') historyId: string,
  ) {
    return this.residentsService.deleteResidentHistoryEntry(companyId, historyId);
  }

  /**
   * Permission: ph.residents.view
   * Obtener residente por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener residente por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.residentsService.findOne(companyId, id);
  }

  /**
   * Permission: ph.residents.create
   * Crear residente
   */
  @Post()
  @ApiOperation({ summary: 'Crear residente' })
  @Audit('resident.created', 'resident')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateResidentDto,
    @Request() req: any,
  ) {
    const result = await this.residentsService.create(companyId, dto);

    // Registrar en historial de la unidad
    this.residentsService.logResidentAdded(
      companyId, dto.unit_id, dto.tercero_id, dto.resident_type,
      req.user?.sub, req.user?.email,
    );

    // Registrar cambio de copropietario si el nuevo residente es propietario
    if (dto.resident_type === 'owner') {
      this.residentsService.logOwnerChange(
        companyId, dto.unit_id, dto.tercero_id,
        req.user?.sub, req.user?.email,
      );
    }

    return result;
  }

  /**
   * Permission: ph.residents.edit
   * Actualizar residente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar residente' })
  @Audit('resident.updated', 'resident')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
    @Request() req: any,
  ) {
    // Capturar datos anteriores para detectar cambios
    const current = await this.residentsService.findOne(companyId, id);

    const result = await this.residentsService.update(companyId, id, dto);

    // Registrar cambio de tipo de residente
    if (dto.resident_type && dto.resident_type !== current.resident_type) {
      this.residentsService.logResidentTypeChanged(
        companyId, current.unit_id, current.tercero_id,
        current.resident_type, dto.resident_type,
        req.user?.sub, req.user?.email,
      );

      // Registrar cambio de copropietario si el tipo cambió a propietario
      if (dto.resident_type === 'owner') {
        this.residentsService.logOwnerChange(
          companyId, current.unit_id, current.tercero_id,
          req.user?.sub, req.user?.email,
        );
      }
    }

    // Registrar cambios de unidad, copropiedad y torre si cambió el unit_id
    if (dto.unit_id && dto.unit_id !== current.unit_id) {
      this.residentsService.logResidentUnitChanged(
        companyId, current.tercero_id,
        current.unit_id, dto.unit_id,
        req.user?.sub, req.user?.email,
      );
      this.residentsService.logResidentCondominiumChanged(
        companyId, current.tercero_id,
        current.unit_id, dto.unit_id,
        req.user?.sub, req.user?.email,
      );
      this.residentsService.logResidentTowerChanged(
        companyId, current.tercero_id,
        current.unit_id, dto.unit_id,
        req.user?.sub, req.user?.email,
      );
    }

    // Registrar cambio de copropietario si cambió el tercero en un residente propietario
    const effectiveType = dto.resident_type || current.resident_type;
    if (dto.tercero_id && dto.tercero_id !== current.tercero_id && effectiveType === 'owner') {
      this.residentsService.logDirectOwnerChange(
        companyId, current.unit_id, current.tercero_id, dto.tercero_id,
        req.user?.sub, req.user?.email,
      );
    }

    return result;
  }

  /**
   * Permission: ph.residents.delete
   * Eliminar residente (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar residente (soft delete)' })
  @Audit('resident.deleted', 'resident')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    // Capturar datos antes de eliminar
    const current = await this.residentsService.findOne(companyId, id);

    const result = await this.residentsService.remove(companyId, id);

    // Registrar en historial de la unidad
    this.residentsService.logResidentRemoved(
      companyId, current.unit_id, current.tercero_id, current.resident_type,
      req.user?.sub, req.user?.email,
    );

    return result;
  }
}
