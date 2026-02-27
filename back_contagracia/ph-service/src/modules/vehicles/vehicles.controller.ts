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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@ApiTags('PH Vehicles')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /**
   * Permission: ph.vehicles.view
   * Lista vehículos con filtros y paginación
   */
  @Get()
  @ApiOperation({ summary: 'Listar vehículos con filtros y paginación' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'unit_id', required: false })
  @ApiQuery({ name: 'vehicle_type', required: false, enum: ['car', 'motorcycle', 'bicycle', 'other'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query('condominium_id') condominium_id?: string,
    @Query('unit_id') unit_id?: string,
    @Query('vehicle_type') vehicle_type?: string,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.vehiclesService.findAll(companyId, {
      condominium_id,
      unit_id,
      vehicle_type,
      search,
      is_active,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      userId: req.user?.sub,
      userRole: req.user?.role_key || req.user?.role,
    });
  }

  /**
   * Permission: ph.vehicles.view
   * Obtener un vehículo por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener vehículo por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.findOne(companyId, id);
  }

  /**
   * Permission: ph.vehicles.create
   * Crear un nuevo vehículo
   */
  @Post()
  @ApiOperation({ summary: 'Crear vehículo' })
  @Audit('vehicle.created', 'vehicle')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(companyId, dto);
  }

  /**
   * Permission: ph.vehicles.edit
   * Actualizar un vehículo existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar vehículo' })
  @Audit('vehicle.updated', 'vehicle')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(companyId, id, dto);
  }

  /**
   * Permission: ph.vehicles.delete
   * Eliminar vehículo (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vehículo (soft delete)' })
  @Audit('vehicle.deleted', 'vehicle')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.remove(companyId, id);
  }
}
