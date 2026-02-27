import { Controller, Get, Query, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { GeneralLedgerService } from './general-ledger.service';

@ApiTags('general-ledger')
@Controller('general-ledger')
export class GeneralLedgerController {
  constructor(private readonly generalLedgerService: GeneralLedgerService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener Libro Mayor por rango de fechas' })
  @ApiQuery({ name: 'date_from', required: true, description: 'Fecha inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: true, description: 'Fecha final (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Libro Mayor generado exitosamente' })
  async getGeneralLedger(
    @Request() req: any,
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
  ) {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException('Los parámetros date_from y date_to son requeridos');
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    // Ajustar to a fin de día
    to.setHours(23, 59, 59, 999);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    if (from > to) {
      throw new BadRequestException('date_from no puede ser mayor que date_to');
    }

    return this.generalLedgerService.getGeneralLedger(req.user.company_id, from, to);
  }
}
