import { Controller, Get, Post, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { PrepaymentsService } from './prepayments.service';

@ApiTags('prepayments')
@Controller('prepayments')
export class PrepaymentsController {
  constructor(private readonly prepaymentsService: PrepaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar anticipos con búsqueda, filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de anticipos' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('prepayment_type') prepayment_type?: string,
    @Query('status') status?: string,
    @Query('third_party_id') third_party_id?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prepaymentsService.findAll(req.user.company_id, {
      search,
      prepayment_type: prepayment_type as any,
      status: status as any,
      third_party_id,
      from_date,
      to_date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener anticipo por ID con movimientos' })
  @ApiResponse({ status: 200, description: 'Detalle del anticipo' })
  @ApiResponse({ status: 404, description: 'Anticipo no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.prepaymentsService.findOne(req.user.company_id, id);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Listar movimientos de un anticipo con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos' })
  async findMovements(
    @Request() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('source_key') source_key?: string,
    @Query('is_voided') is_voided?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prepaymentsService.findMovements(req.user.company_id, id, {
      search,
      source_key,
      is_voided,
      from_date,
      to_date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  @Audit('prepayment.created', 'prepayment')
  @ApiOperation({ summary: 'Crear anticipo (cliente, proveedor o empleado)' })
  @ApiResponse({ status: 201, description: 'Anticipo creado' })
  async createPrepayment(@Request() req: any, @Body() dto: any): Promise<any> {
    return this.prepaymentsService.createPrepayment(req.user.company_id, dto);
  }

  @Post(':id/void')
  @Audit('prepayment.voided', 'prepayment')
  @ApiOperation({ summary: 'Anular anticipo' })
  @ApiResponse({ status: 200, description: 'Anticipo anulado' })
  async voidPrepayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string; void_date: string },
  ): Promise<any> {
    return this.prepaymentsService.voidPrepayment(
      req.user.company_id,
      id,
      {
        reason: body.reason,
        void_date: body.void_date,
        voided_by: req.user.user_id,
      },
    );
  }

  @Post(':id/refund')
  @Audit('prepayment.refunded', 'prepayment')
  @ApiOperation({ summary: 'Devolver anticipo completo' })
  @ApiResponse({ status: 200, description: 'Devolución registrada' })
  async refundPrepayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { date: string; reason?: string },
  ): Promise<any> {
    return this.prepaymentsService.refundPrepayment(req.user.company_id, id, {
      date: body.date,
      reason: body.reason,
      refunded_by: req.user.user_id,
    });
  }

}
