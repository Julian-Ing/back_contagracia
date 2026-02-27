import { Controller, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Audit('payment.created', 'payment')
  @ApiOperation({ summary: 'Crear pago contra documento CxC/CxP' })
  @ApiResponse({ status: 201, description: 'Pago creado' })
  async createPayment(@Request() req: any, @Body() dto: any): Promise<any> {
    return this.paymentsService.createPayment(req.user.company_id, dto);
  }
}
