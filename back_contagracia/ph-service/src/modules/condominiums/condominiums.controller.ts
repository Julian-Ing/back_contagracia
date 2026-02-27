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
import { CondominiumsService } from './condominiums.service';
import { CreateCondominiumDto } from './dto/create-condominium.dto';
import { UpdateCondominiumDto } from './dto/update-condominium.dto';
import { CreateTowerDto } from './dto/create-tower.dto';
import { UpdateTowerDto } from './dto/update-tower.dto';

@ApiTags('PH Condominiums')
@ApiBearerAuth('JWT-auth')
@Controller('companies/:companyId/ph/condominiums')
export class CondominiumsController {
  constructor(private readonly condominiumsService: CondominiumsService) {}

  // ─── Condominiums ────────────────────────────────────────────────

  /**
   * Permission: ph.condominiums.view
   * Lista condominios con filtros y paginacion
   */
  @Get()
  @ApiOperation({ summary: 'Listar condominios con filtros y paginacion' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.condominiumsService.findAll(companyId, {
      search,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      userId: req.user?.sub,
      userRole: req.user?.role_key || req.user?.role,
      permissions: req.user?.permissions || [],
    });
  }

  /**
   * Permission: ph.condominiums.view
   * Obtiene un condominio por ID con sus torres
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener condominio por ID con sus torres' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.condominiumsService.findOne(companyId, id);
  }

  /**
   * Permission: ph.condominiums.create
   * Crea un nuevo condominio
   */
  @Post()
  @ApiOperation({ summary: 'Crear condominio' })
  @Audit('condominium.created', 'condominium')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCondominiumDto,
    @Request() req: any,
  ) {
    return this.condominiumsService.create(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.condominiums.edit
   * Actualiza un condominio existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar condominio' })
  @Audit('condominium.updated', 'condominium')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCondominiumDto,
  ) {
    return this.condominiumsService.update(companyId, id, dto);
  }

  /**
   * Permission: ph.condominiums.delete
   * Elimina un condominio (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar condominio (soft delete)' })
  @Audit('condominium.deleted', 'condominium')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.condominiumsService.remove(companyId, id);
  }

  // ─── Towers (sub-resource) ──────────────────────────────────────

  /**
   * Permission: ph.towers.view
   * Lista torres de un condominio
   */
  @Get(':condominiumId/towers')
  @ApiOperation({ summary: 'Listar torres de un condominio' })
  async getTowers(
    @Param('companyId') companyId: string,
    @Param('condominiumId') condominiumId: string,
  ) {
    return this.condominiumsService.getTowers(companyId, condominiumId);
  }

  /**
   * Permission: ph.towers.create
   * Crea una torre en un condominio
   */
  @Post(':condominiumId/towers')
  @ApiOperation({ summary: 'Crear torre en un condominio' })
  @Audit('tower.created', 'tower')
  async createTower(
    @Param('companyId') companyId: string,
    @Param('condominiumId') condominiumId: string,
    @Body() dto: CreateTowerDto,
    @Request() req: any,
  ) {
    return this.condominiumsService.createTower(companyId, condominiumId, dto, req.user.sub);
  }

  /**
   * Permission: ph.towers.edit
   * Actualiza una torre
   */
  @Patch(':condominiumId/towers/:towerId')
  @ApiOperation({ summary: 'Actualizar torre' })
  @Audit('tower.updated', 'tower')
  async updateTower(
    @Param('companyId') companyId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('towerId') towerId: string,
    @Body() dto: UpdateTowerDto,
  ) {
    return this.condominiumsService.updateTower(companyId, condominiumId, towerId, dto);
  }

  /**
   * Permission: ph.towers.delete
   * Elimina una torre (soft delete)
   */
  @Delete(':condominiumId/towers/:towerId')
  @ApiOperation({ summary: 'Eliminar torre (soft delete)' })
  @Audit('tower.deleted', 'tower')
  async removeTower(
    @Param('companyId') companyId: string,
    @Param('condominiumId') condominiumId: string,
    @Param('towerId') towerId: string,
  ) {
    return this.condominiumsService.removeTower(companyId, condominiumId, towerId);
  }
}
