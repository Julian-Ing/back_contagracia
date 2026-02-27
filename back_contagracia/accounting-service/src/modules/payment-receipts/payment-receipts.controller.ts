import { Controller, Get, Post, Put, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { PaymentReceiptsService } from './payment-receipts.service';

@ApiTags('payment-receipts')
@Controller('payment-receipts')
export class PaymentReceiptsController {
  constructor(private readonly paymentReceiptsService: PaymentReceiptsService) {}

  @Post()
  @Audit('payment_receipt.created', 'payment_receipt')
  @ApiOperation({ summary: 'Crear recibo de caja (RECEIVABLE) o comprobante de egreso (PAYABLE)' })
  @ApiResponse({ status: 201, description: 'Recibo/comprobante creado' })
  async createPaymentReceipt(@Request() req: any, @Body() dto: any): Promise<any> {
    return this.paymentReceiptsService.createPaymentReceipt(req.user.company_id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un recibo con sus líneas' })
  @ApiResponse({ status: 200, description: 'Detalle del recibo' })
  async getOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.paymentReceiptsService.getOne(req.user.company_id, id);
  }

  @Put(':id')
  @Audit('payment_receipt.updated', 'payment_receipt')
  @ApiOperation({ summary: 'Editar recibo (anula el actual y crea uno nuevo)' })
  @ApiResponse({ status: 200, description: 'Recibo editado (nuevo recibo creado)' })
  async editPaymentReceipt(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ): Promise<any> {
    return this.paymentReceiptsService.editPaymentReceipt(req.user.company_id, id, dto);
  }

  @Post(':id/reverse')
  @Audit('payment_receipt.reversed', 'payment_receipt')
  @ApiOperation({ summary: 'Reversar recibo de caja o comprobante de egreso' })
  @ApiResponse({ status: 200, description: 'Recibo/comprobante reversado' })
  async reversePaymentReceipt(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<any> {
    return this.paymentReceiptsService.reversePaymentReceipt(req.user.company_id, id, reason);
  }
}
