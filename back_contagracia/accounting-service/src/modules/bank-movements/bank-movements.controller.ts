import { Controller, Get, Post, Body, Param, Query, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { BankMovementsService } from './bank-movements.service';
import { CreateBankMovementDto } from './dto/create-bank-movement.dto';

@ApiTags('bank-movements')
@Controller('bank-movements')
export class BankMovementsController {
  constructor(private readonly bankMovementsService: BankMovementsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar movimientos bancarios con búsqueda y paginación' })
  @ApiQuery({ name: 'bank_account_id', required: true, description: 'ID de la cuenta bancaria' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por consecutivo, descripción o referencia' })
  @ApiQuery({ name: 'type_key', required: false, description: 'Filtrar por tipo de movimiento' })
  @ApiQuery({ name: 'from_date', required: false, description: 'Fecha desde (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to_date', required: false, description: 'Fecha hasta (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista de movimientos bancarios' })
  async findAll(
    @Request() req: any,
    @Query('bank_account_id') bank_account_id: string,
    @Query('search') search?: string,
    @Query('type_key') type_key?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.bankMovementsService.findAll(req.user.company_id, {
      bank_account_id,
      search,
      type_key,
      from_date,
      to_date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  @Audit('bank_movement.created', 'bank_movement')
  @ApiOperation({ summary: 'Crear movimiento bancario' })
  @ApiResponse({ status: 201, description: 'Movimiento creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Request() req: any,
    @Body() dto: CreateBankMovementDto,
  ): Promise<any> {
    return this.bankMovementsService.create(req.user.company_id, {
      bank_account_id: dto.bank_account_id,
      transaction_date: new Date(dto.transaction_date),
      amount: dto.amount,
      direction: dto.direction,
      type_key: dto.type_key,
      description: dto.description,
      reference_id: dto.reference_id,
      reference_type: dto.reference_type,
      reference_consecutive: dto.reference_consecutive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener movimiento bancario por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del movimiento bancario' })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.bankMovementsService.findOne(req.user.company_id, id);
  }
}
