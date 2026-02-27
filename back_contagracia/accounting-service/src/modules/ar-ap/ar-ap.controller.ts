import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ArApService } from './ar-ap.service';
import { ArApType, PaymentReceiptType } from '@prisma/client-tenant';

@ApiTags('ar-ap')
@Controller('ar-ap')
export class ArApController {
  constructor(private readonly arApService: ArApService) {}

  @Get('sources')
  @ApiOperation({ summary: 'Lista de tipos de documento (ar_ap_sources)' })
  @ApiResponse({ status: 200, description: 'Lista de fuentes de CxC/CxP' })
  async getSources(@Request() req: any): Promise<any> {
    return this.arApService.getSources(req.user.company_id);
  }

  @Get('summary-by-third-party')
  @ApiOperation({ summary: 'Resumen de saldos agrupado por tercero' })
  @ApiQuery({ name: 'type', required: true, enum: ['RECEIVABLE', 'PAYABLE'] })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o documento' })
  @ApiQuery({ name: 'bucket', required: false, enum: ['all', 'overdue', '0-30', '31-60', '60+'] })
  @ApiQuery({ name: 'tab', required: false, enum: ['pending', 'paid', 'all'], description: 'Filtro de pestaña' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Emisión desde YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Emisión hasta YYYY-MM-DD' })
  @ApiQuery({ name: 'dueDateFrom', required: false, description: 'Vencimiento desde YYYY-MM-DD' })
  @ApiQuery({ name: 'dueDateTo', required: false, description: 'Vencimiento hasta YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de terceros con saldos' })
  async getSummaryByThirdParty(
    @Request() req: any,
    @Query('type') type: ArApType,
    @Query('search') search?: string,
    @Query('bucket') bucket?: string,
    @Query('tab') tab?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    if (!type || !['RECEIVABLE', 'PAYABLE'].includes(type)) {
      type = ArApType.RECEIVABLE;
    }
    return this.arApService.getSummaryByThirdParty(req.user.company_id, {
      type,
      search,
      bucket: (bucket as any) || 'all',
      tab: (['pending', 'paid', 'all'].includes(tab || '') ? tab : 'all') as any,
      dateFrom,
      dateTo,
      dueDateFrom,
      dueDateTo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('payment-receipts')
  @ApiOperation({ summary: 'Listado de recibos de caja o comprobantes de egreso' })
  @ApiQuery({ name: 'type', required: true, enum: ['RECEIVABLE', 'PAYABLE'] })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por consecutivo, descripción o tercero' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Fecha inicio YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Fecha fin YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de recibos/comprobantes' })
  async getPaymentReceipts(
    @Request() req: any,
    @Query('type') type: PaymentReceiptType,
    @Query('exclude_types') exclude_types?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    if (!type || !['RECEIVABLE', 'PAYABLE'].includes(type)) {
      type = PaymentReceiptType.RECEIVABLE;
    }
    return this.arApService.getPaymentReceipts(req.user.company_id, {
      type,
      exclude_types: exclude_types ? exclude_types.split(',') as PaymentReceiptType[] : undefined,
      search,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('third-party/:thirdPartyId/payments')
  @ApiOperation({ summary: 'Pagos paginados de un tercero con filtros' })
  @ApiQuery({ name: 'type', required: true, enum: ['RECEIVABLE', 'PAYABLE'] })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por consecutivo, doc CxC/CxP, doc origen, descripción' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Fecha pago desde YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Fecha pago hasta YYYY-MM-DD' })
  @ApiQuery({ name: 'sourceKey', required: false, description: 'Tipo de documento origen (invoice, purchase, manual, etc.)' })
  @ApiQuery({ name: 'paymentMethodId', required: false, description: 'ID del método de pago' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 10)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pagos del tercero' })
  async getThirdPartyPayments(
    @Request() req: any,
    @Param('thirdPartyId') thirdPartyId: string,
    @Query('type') type: ArApType,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sourceKey') sourceKey?: string,
    @Query('paymentMethodId') paymentMethodId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    if (!type || !['RECEIVABLE', 'PAYABLE'].includes(type)) {
      type = ArApType.RECEIVABLE;
    }
    return this.arApService.getThirdPartyPayments(req.user.company_id, thirdPartyId, {
      type,
      search,
      dateFrom,
      dateTo,
      sourceKey,
      paymentMethodId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('third-party/:thirdPartyId/detail')
  @ApiOperation({ summary: 'Detalle de documentos y pagos de un tercero' })
  @ApiQuery({ name: 'type', required: true, enum: ['RECEIVABLE', 'PAYABLE'] })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar en documentos o pagos (fuzzy)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Emisión desde YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Emisión hasta YYYY-MM-DD' })
  @ApiQuery({ name: 'dueDateFrom', required: false, description: 'Vencimiento desde YYYY-MM-DD' })
  @ApiQuery({ name: 'dueDateTo', required: false, description: 'Vencimiento hasta YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 10)' })
  @ApiQuery({ name: 'statuses', required: false, description: 'Filtrar por estados: PENDING,PARTIAL,PAID' })
  @ApiQuery({ name: 'overdue', required: false, enum: ['all', 'overdue', 'current'], description: 'Filtro de vencimiento' })
  @ApiResponse({ status: 200, description: 'Documentos y pagos del tercero' })
  async getThirdPartyDetail(
    @Request() req: any,
    @Param('thirdPartyId') thirdPartyId: string,
    @Query('type') type: ArApType,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('statuses') statuses?: string,
    @Query('overdue') overdue?: string,
  ): Promise<any> {
    if (!type || !['RECEIVABLE', 'PAYABLE'].includes(type)) {
      type = ArApType.RECEIVABLE;
    }
    const validStatuses = ['PENDING', 'PARTIAL', 'PAID'];
    const parsedStatuses = statuses
      ? statuses.split(',').filter(s => validStatuses.includes(s)) as any[]
      : undefined;
    return this.arApService.getThirdPartyDetail(req.user.company_id, thirdPartyId, {
      type,
      search,
      dateFrom,
      dateTo,
      dueDateFrom,
      dueDateTo,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      statuses: parsedStatuses && parsedStatuses.length > 0 ? parsedStatuses : undefined,
      overdue: (['all', 'overdue', 'current'].includes(overdue || '') ? overdue : 'all') as any,
    });
  }
}
