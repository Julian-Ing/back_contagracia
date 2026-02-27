import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateStorageDto, UpdateStorageDto, AssignUsersDto } from './dto';

@ApiTags('warehouses')
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  // ────── Rutas fijas (ANTES de :id para evitar colisión) ──────

  @Get('me/storages')
  async getMyStorages(@Request() req: any) {
    return this.warehousesService.getUserStorages(req.user.company_id, req.user.tenant_user_id);
  }

  @Get('for-select')
  async findWarehousesForSelect(
    @Request() req: any,
    @Query('search') search?: string,
  ) {
    return this.warehousesService.findWarehousesForSelect(req.user.company_id, search);
  }

  @Get('storages/for-select')
  async findStoragesForSelect(
    @Request() req: any,
    @Query('warehouse_id') warehouseId?: string,
    @Query('search') search?: string,
  ) {
    return this.warehousesService.findStoragesForSelect(req.user.company_id, warehouseId, search);
  }

  @Get('storages/list')
  async findAllStorages(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehousesService.findAllStorages(req.user.company_id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ────── Almacenes ──────

  @Get()
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehousesService.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.warehousesService.findOne(req.user.company_id, id);
  }

  @Post()
  @Audit('warehouse.created', 'warehouse')
  async create(@Request() req: any, @Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(req.user.company_id, dto);
  }

  @Patch(':id')
  @Audit('warehouse.updated', 'warehouse')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @Audit('warehouse.deleted', 'warehouse')
  @HttpCode(HttpStatus.OK)
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.warehousesService.delete(req.user.company_id, id);
  }

  // ────── Bodegas (anidadas en almacén) ──────

  @Post(':id/storages')
  @Audit('storage.created', 'storage')
  async createStorage(
    @Request() req: any,
    @Param('id') warehouseId: string,
    @Body() dto: CreateStorageDto,
  ) {
    return this.warehousesService.createStorage(req.user.company_id, warehouseId, dto);
  }

  @Patch('storages/:storageId')
  @Audit('storage.updated', 'storage')
  async updateStorage(
    @Request() req: any,
    @Param('storageId') storageId: string,
    @Body() dto: UpdateStorageDto,
  ) {
    return this.warehousesService.updateStorage(req.user.company_id, storageId, dto);
  }

  @Delete('storages/:storageId')
  @Audit('storage.deleted', 'storage')
  @HttpCode(HttpStatus.OK)
  async deleteStorage(@Request() req: any, @Param('storageId') storageId: string) {
    return this.warehousesService.deleteStorage(req.user.company_id, storageId);
  }

  // ────── Usuarios de Almacén ──────

  @Post(':id/users')
  @Audit('warehouse.users_assigned', 'warehouse')
  async assignUsers(
    @Request() req: any,
    @Param('id') warehouseId: string,
    @Body() dto: AssignUsersDto,
  ) {
    return this.warehousesService.assignUsers(req.user.company_id, warehouseId, dto);
  }

  @Delete(':id/users/:userId')
  @Audit('warehouse.user_removed', 'warehouse')
  @HttpCode(HttpStatus.OK)
  async removeUser(
    @Request() req: any,
    @Param('id') warehouseId: string,
    @Param('userId') userId: string,
  ) {
    return this.warehousesService.removeUser(req.user.company_id, warehouseId, userId);
  }

}
