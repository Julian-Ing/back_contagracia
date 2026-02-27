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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import * as express from 'express';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';

@ApiTags('PH Rentals')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  /**
   * Permission: ph.rentals.view
   * Lista alquileres con filtros y paginacion
   */
  @Get()
  @ApiOperation({ summary: 'Listar alquileres de unidades' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'unit_id', required: false })
  @ApiQuery({ name: 'renter_unit_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('unit_id') unitId?: string,
    @Query('renter_unit_id') renterUnitId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.rentalsService.findAll(companyId, {
      condominium_id: condominiumId,
      unit_id: unitId,
      renter_unit_id: renterUnitId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Permission: ph.rentals.view
   * Obtener un alquiler por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener alquiler por ID' })
  @ApiParam({ name: 'id', description: 'ID del alquiler' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.rentalsService.findOne(companyId, id);
  }

  /**
   * Permission: ph.rentals.create
   * Crear un nuevo alquiler
   */
  @Post()
  @ApiOperation({ summary: 'Crear alquiler de unidad' })
  @Audit('rental.created', 'rental')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateRentalDto,
    @Request() req: any,
  ) {
    return this.rentalsService.create(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.rentals.edit
   * Actualizar un alquiler (notas, monto)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar alquiler' })
  @ApiParam({ name: 'id', description: 'ID del alquiler' })
  @Audit('rental.updated', 'rental')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRentalDto,
  ) {
    return this.rentalsService.update(companyId, id, dto);
  }

  /**
   * Permission: ph.rentals.checkout
   * Checkout: completar el alquiler y calcular monto
   */
  @Patch(':id/checkout')
  @ApiOperation({ summary: 'Checkout: completar alquiler y calcular cobro' })
  @ApiParam({ name: 'id', description: 'ID del alquiler' })
  @Audit('rental.checked_out', 'rental')
  async checkout(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.rentalsService.checkout(companyId, id);
  }

  /**
   * Permission: ph.rentals.view
   * Descargar soporte de alquiler en PDF
   */
  @Get(':id/receipt')
  @ApiOperation({ summary: 'Descargar soporte de alquiler (PDF)' })
  @ApiParam({ name: 'id', description: 'ID del alquiler' })
  async getReceipt(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const buffer = await this.rentalsService.generateReceiptPdf(companyId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="soporte-alquiler-${id.slice(0, 8)}.pdf"`,
    });
    res.send(buffer);
  }

  /**
   * Permission: ph.rentals.delete
   * Cancelar un alquiler
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar alquiler' })
  @ApiParam({ name: 'id', description: 'ID del alquiler' })
  @Audit('rental.cancelled', 'rental')
  async cancel(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.rentalsService.cancel(companyId, id);
  }
}
