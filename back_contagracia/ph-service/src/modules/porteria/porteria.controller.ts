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
import { PorteriaService } from './porteria.service';
import { CreateAccessLogDto, CreatePackageDto, CreateMinutaEntryDto, UpdateMinutaEntryDto } from './dto';

@ApiTags('PH Portería')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/porteria')
export class PorteriaController {
  constructor(private readonly service: PorteriaService) {}

  // ─── Access Logs ──────────────────────────────────────────────

  /** Permission: ph.porteria.view */
  @Get('access-logs')
  @ApiOperation({ summary: 'Listar registros de acceso' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'visit_type', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAllAccessLogs(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('visit_type') visitType?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAllAccessLogs(companyId, {
      condominium_id: condominiumId,
      visit_type: visitType,
      date_from: dateFrom,
      date_to: dateTo,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /** Permission: ph.porteria.manage_access */
  @Post('access-logs')
  @ApiOperation({ summary: 'Registrar ingreso' })
  createAccessLog(
    @Param('companyId') companyId: string,
    @Body() dto: CreateAccessLogDto,
    @Request() req: any,
  ) {
    return this.service.createAccessLog(companyId, dto, req.user.sub);
  }

  /** Permission: ph.porteria.manage_access */
  @Patch('access-logs/:id/exit')
  @ApiOperation({ summary: 'Registrar salida' })
  registerExit(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.registerExit(companyId, id);
  }

  /** Permission: ph.porteria.manage_access */
  @Delete('access-logs/:id')
  @ApiOperation({ summary: 'Eliminar registro de acceso' })
  removeAccessLog(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeAccessLog(companyId, id);
  }

  // ─── Packages ─────────────────────────────────────────────────

  /** Permission: ph.porteria.view */
  @Get('packages')
  @ApiOperation({ summary: 'Listar paquetes' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'unit_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAllPackages(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('unit_id') unitId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAllPackages(companyId, {
      condominium_id: condominiumId,
      unit_id: unitId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /** Permission: ph.porteria.view */
  @Get('packages/stats')
  @ApiOperation({ summary: 'Estadísticas de paquetes' })
  @ApiQuery({ name: 'condominium_id', required: false })
  getPackageStats(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
  ) {
    return this.service.getPackageStats(companyId, condominiumId);
  }

  /** Permission: ph.porteria.manage_packages */
  @Post('packages')
  @ApiOperation({ summary: 'Registrar paquete recibido' })
  createPackage(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePackageDto,
    @Request() req: any,
  ) {
    return this.service.createPackage(companyId, dto, req.user.sub);
  }

  /** Permission: ph.porteria.manage_packages */
  @Patch('packages/:id/deliver')
  @ApiOperation({ summary: 'Marcar paquete como entregado' })
  deliverPackage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.deliverPackage(companyId, id);
  }

  /** Permission: ph.porteria.manage_packages */
  @Delete('packages/:id')
  @ApiOperation({ summary: 'Eliminar paquete' })
  removePackage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.removePackage(companyId, id);
  }

  // ─── Minuta ───────────────────────────────────────────────────

  /** Permission: ph.porteria.view */
  @Get('minuta')
  @ApiOperation({ summary: 'Listar entradas de minuta' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'entry_type', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAllMinuta(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('entry_type') entryType?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAllMinuta(companyId, {
      condominium_id: condominiumId,
      entry_type: entryType,
      date_from: dateFrom,
      date_to: dateTo,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /** Permission: ph.porteria.manage_minuta */
  @Post('minuta')
  @ApiOperation({ summary: 'Crear entrada de minuta' })
  createMinutaEntry(
    @Param('companyId') companyId: string,
    @Body() dto: CreateMinutaEntryDto,
    @Request() req: any,
  ) {
    return this.service.createMinutaEntry(companyId, dto, req.user.sub);
  }

  /** Permission: ph.porteria.manage_minuta */
  @Patch('minuta/:id')
  @ApiOperation({ summary: 'Editar entrada de minuta' })
  updateMinutaEntry(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMinutaEntryDto,
  ) {
    return this.service.updateMinutaEntry(companyId, id, dto);
  }

  /** Permission: ph.porteria.manage_minuta */
  @Delete('minuta/:id')
  @ApiOperation({ summary: 'Eliminar entrada de minuta' })
  removeMinutaEntry(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeMinutaEntry(companyId, id);
  }
}
