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
import * as express from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { BillingService } from './billing.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { GenerateFeesDto } from './dto/generate-fees.dto';
import { CreateBillingConfigDto } from './dto/create-billing-config.dto';
import { UpdateBillingConfigDto } from './dto/update-billing-config.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('PH Billing')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Periods ────────────────────────────────────────────────────

  /**
   * Permission: ph.billing.view
   * Lista periodos de facturacion con filtros y paginacion
   */
  @Get('periods')
  @ApiOperation({ summary: 'Listar periodos de facturacion' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAllPeriods(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.billingService.findAllPeriods(companyId, {
      condominium_id: condominiumId,
      year: year ? parseInt(year, 10) : undefined,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Permission: ph.billing.view
   * Obtiene un periodo por ID con sus cobros
   */
  @Get('periods/:periodId')
  @ApiOperation({ summary: 'Obtener periodo por ID con cobros' })
  async findOnePeriod(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.billingService.findOnePeriod(companyId, periodId);
  }

  /**
   * Permission: ph.billing.create_period
   * Crea un nuevo periodo de facturacion
   */
  @Post('periods')
  @ApiOperation({ summary: 'Crear periodo de facturacion' })
  @Audit('billing_period.created', 'billing_period')
  async createPeriod(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePeriodDto,
    @Request() req: any,
  ) {
    return this.billingService.createPeriod(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.billing.edit_period
   * Actualiza un periodo existente
   */
  @Patch('periods/:periodId')
  @ApiOperation({ summary: 'Actualizar periodo de facturacion' })
  @Audit('billing_period.updated', 'billing_period')
  async updatePeriod(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Body() dto: UpdatePeriodDto,
  ) {
    return this.billingService.updatePeriod(companyId, periodId, dto);
  }

  /**
   * Permission: ph.billing.delete_period
   * Elimina un periodo (solo si esta en borrador)
   */
  @Delete('periods/:periodId')
  @ApiOperation({ summary: 'Eliminar periodo (solo borrador)' })
  @Audit('billing_period.deleted', 'billing_period')
  async deletePeriod(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.billingService.deletePeriod(companyId, periodId);
  }

  /**
   * Permission: ph.billing.close_period
   * Cierra un periodo de facturacion
   */
  @Patch('periods/:periodId/close')
  @ApiOperation({ summary: 'Cerrar periodo de facturacion' })
  @Audit('billing_period.closed', 'billing_period')
  async closePeriod(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.billingService.closePeriod(companyId, periodId);
  }

  /**
   * Permission: ph.billing.generate_fees
   * Genera cobros masivamente para un periodo
   */
  @Post('periods/:periodId/generate-fees')
  @ApiOperation({ summary: 'Generar cobros para un periodo' })
  @Audit('billing_fee.generated', 'billing_fee')
  async generateFees(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Body() dto: GenerateFeesDto,
    @Request() req: any,
  ) {
    return this.billingService.generateFees(companyId, periodId, dto, req.user.sub);
  }

  // ─── Send Invoices ─────────────────────────────────────────────

  /**
   * Permission: ph.billing.generate_fees
   * Envía las facturas del periodo por email a los residentes
   */
  @Post('periods/:periodId/send-invoices')
  @ApiOperation({ summary: 'Enviar facturas del periodo por email' })
  @Audit('billing_period.invoices_sent', 'billing_period')
  async sendPeriodInvoices(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.billingService.sendPeriodInvoices(companyId, periodId);
  }

  // ─── Cartera ───────────────────────────────────────────────────

  /**
   * Permission: ph.billing.view
   * Resumen de cartera agrupado por unidad
   */
  @Get('cartera/summary')
  @ApiOperation({ summary: 'Resumen de cartera (cuentas por cobrar)' })
  @ApiQuery({ name: 'condominium_id', required: false })
  async getCarteraSummary(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query('condominium_id') condominiumId?: string,
  ) {
    return this.billingService.getCarteraSummary(companyId, {
      condominium_id: condominiumId,
      userId: req.user?.sub,
      userRole: req.user?.role_key || req.user?.role,
      permissions: req.user?.permissions || [],
    });
  }

  /**
   * Permission: ph.billing.view
   * IDs de unidades con cuotas vencidas (morosos)
   */
  @Get('delinquent-units')
  @ApiOperation({ summary: 'Unidades con cuotas vencidas' })
  async getDelinquentUnits(
    @Param('companyId') companyId: string,
  ) {
    return this.billingService.getDelinquentUnits(companyId);
  }

  // ─── Fees ───────────────────────────────────────────────────────

  /**
   * Permission: ph.billing.view
   * Lista cobros con filtros y paginacion
   */
  @Get('fees')
  @ApiOperation({ summary: 'Listar cobros con filtros' })
  @ApiQuery({ name: 'billing_period_id', required: false })
  @ApiQuery({ name: 'unit_id', required: false })
  @ApiQuery({ name: 'fee_concept_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAllFees(
    @Param('companyId') companyId: string,
    @Query('billing_period_id') billingPeriodId?: string,
    @Query('unit_id') unitId?: string,
    @Query('fee_concept_id') feeConceptId?: string,
    @Query('status') status?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.billingService.findAllFees(companyId, {
      billing_period_id: billingPeriodId,
      unit_id: unitId,
      fee_concept_id: feeConceptId,
      status,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Permission: ph.billing.view
   * Obtiene un cobro por ID con todas sus relaciones
   */
  @Get('fees/:feeId')
  @ApiOperation({ summary: 'Obtener cobro por ID' })
  async findOneFee(
    @Param('companyId') companyId: string,
    @Param('feeId') feeId: string,
  ) {
    return this.billingService.findOneFee(companyId, feeId);
  }

  /**
   * Permission: ph.billing.edit_fee
   * Actualiza un cobro
   */
  @Patch('fees/:feeId')
  @ApiOperation({ summary: 'Actualizar cobro' })
  @Audit('billing_fee.updated', 'billing_fee')
  async updateFee(
    @Param('companyId') companyId: string,
    @Param('feeId') feeId: string,
    @Body() dto: UpdateFeeDto,
  ) {
    return this.billingService.updateFee(companyId, feeId, dto);
  }

  /**
   * Permission: ph.billing.delete_fee
   * Elimina un cobro (solo si el periodo esta en borrador)
   */
  @Delete('fees/:feeId')
  @ApiOperation({ summary: 'Eliminar cobro (solo si periodo en borrador)' })
  @Audit('billing_fee.deleted', 'billing_fee')
  async deleteFee(
    @Param('companyId') companyId: string,
    @Param('feeId') feeId: string,
  ) {
    return this.billingService.deleteFee(companyId, feeId);
  }

  // ─── Payments (Abonos) ─────────────────────────────────────────

  /**
   * Permission: ph.billing.create_payment
   * Registra un abono/pago parcial a una cuota
   */
  @Post('fees/:feeId/payments')
  @ApiOperation({ summary: 'Registrar abono/pago a una cuota' })
  @Audit('billing_payment.created', 'billing_payment')
  async createPayment(
    @Param('companyId') companyId: string,
    @Param('feeId') feeId: string,
    @Body() dto: CreatePaymentDto,
    @Request() req: any,
  ) {
    return this.billingService.createPayment(companyId, feeId, dto, req.user.sub);
  }

  /**
   * Permission: ph.billing.view
   * Lista los pagos/abonos de una cuota
   */
  @Get('fees/:feeId/payments')
  @ApiOperation({ summary: 'Listar pagos de una cuota' })
  async findFeePayments(
    @Param('companyId') companyId: string,
    @Param('feeId') feeId: string,
  ) {
    return this.billingService.findFeePayments(companyId, feeId);
  }

  // ─── PDF Generation ───────────────────────────────────────────

  @Get('fees/:feeId/pdf')
  @ApiOperation({ summary: 'Descargar PDF de una cuota' })
  async downloadFeePdf(
    @Param('companyId') companyId: string,
    @Param('feeId') feeId: string,
    @Res() res: express.Response,
  ) {
    const pdfBuffer = await this.billingService.generateFeePdf(companyId, feeId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cuota-${feeId.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  }

  @Get('units/:unitId/statement-pdf')
  @ApiOperation({ summary: 'Descargar estado de cuenta PDF de una unidad' })
  async downloadUnitStatement(
    @Param('companyId') companyId: string,
    @Param('unitId') unitId: string,
    @Res() res: express.Response,
  ) {
    const pdfBuffer = await this.billingService.generateUnitStatementPdf(companyId, unitId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=estado-cuenta-${unitId.slice(0, 8)}.pdf`);
    res.send(pdfBuffer);
  }

  // ─── Billing Configs ──────────────────────────────────────────

  /**
   * Permission: ph.billing.view
   * Lista configuraciones de facturacion (interes, descuento, recargo)
   */
  @Get('configs')
  @ApiOperation({ summary: 'Listar configuraciones de facturacion' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'config_type', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAllBillingConfigs(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('config_type') configType?: string,
    @Query('is_active') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.billingService.findAllBillingConfigs(companyId, {
      condominium_id: condominiumId,
      config_type: configType,
      is_active: isActive,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Permission: ph.billing.view
   * Obtiene una configuracion por ID
   */
  @Get('configs/:configId')
  @ApiOperation({ summary: 'Obtener configuracion por ID' })
  async findOneBillingConfig(
    @Param('companyId') companyId: string,
    @Param('configId') configId: string,
  ) {
    return this.billingService.findOneBillingConfig(companyId, configId);
  }

  /**
   * Permission: ph.billing.create_config
   * Crea una configuracion de facturacion
   */
  @Post('configs')
  @ApiOperation({ summary: 'Crear configuracion de facturacion' })
  @Audit('billing_config.created', 'billing_config')
  async createBillingConfig(
    @Param('companyId') companyId: string,
    @Body() dto: CreateBillingConfigDto,
    @Request() req: any,
  ) {
    return this.billingService.createBillingConfig(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.billing.edit_config
   * Actualiza una configuracion de facturacion
   */
  @Patch('configs/:configId')
  @ApiOperation({ summary: 'Actualizar configuracion de facturacion' })
  @Audit('billing_config.updated', 'billing_config')
  async updateBillingConfig(
    @Param('companyId') companyId: string,
    @Param('configId') configId: string,
    @Body() dto: UpdateBillingConfigDto,
  ) {
    return this.billingService.updateBillingConfig(companyId, configId, dto);
  }

  /**
   * Permission: ph.billing.delete_config
   * Elimina una configuracion de facturacion
   */
  @Delete('configs/:configId')
  @ApiOperation({ summary: 'Eliminar configuracion de facturacion' })
  @Audit('billing_config.deleted', 'billing_config')
  async removeBillingConfig(
    @Param('companyId') companyId: string,
    @Param('configId') configId: string,
  ) {
    return this.billingService.removeBillingConfig(companyId, configId);
  }

  /**
   * Permission: ph.billing.edit_config
   * Alterna el estado activo/inactivo de una configuracion
   */
  @Patch('configs/:configId/toggle')
  @ApiOperation({ summary: 'Toggle activo/inactivo de configuracion' })
  @Audit('billing_config.toggled', 'billing_config')
  async toggleBillingConfig(
    @Param('companyId') companyId: string,
    @Param('configId') configId: string,
  ) {
    return this.billingService.toggleBillingConfig(companyId, configId);
  }
}
