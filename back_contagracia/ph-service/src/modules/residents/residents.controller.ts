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
  ) {
    return this.residentsService.create(companyId, dto);
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
  ) {
    return this.residentsService.update(companyId, id, dto);
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
  ) {
    return this.residentsService.remove(companyId, id);
  }
}
