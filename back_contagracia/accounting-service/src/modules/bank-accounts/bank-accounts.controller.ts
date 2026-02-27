import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { BankAccountsService, CreateBankAccountDto, UpdateBankAccountDto } from './bank-accounts.service';
import { BankAccountType } from '@prisma/client-tenant';

@ApiTags('bank-accounts')
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cuentas bancarias con búsqueda y paginación' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o número de cuenta' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo (SAVINGS, CHECKING, CASH)' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 50)' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Incluir cuentas inactivas (default: false)' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas bancarias' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('type') type?: BankAccountType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<any> {
    return this.bankAccountsService.findAll(req.user.company_id, {
      search,
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cuenta bancaria por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la cuenta bancaria' })
  @ApiResponse({ status: 404, description: 'Cuenta bancaria no encontrada' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.bankAccountsService.findOne(req.user.company_id, id);
  }

  @Get(':id/can-delete')
  @ApiOperation({ summary: 'Verificar si se puede eliminar una cuenta bancaria' })
  @ApiResponse({ status: 200, description: 'Resultado de la verificación' })
  @ApiResponse({ status: 404, description: 'Cuenta bancaria no encontrada' })
  async canDelete(@Request() req: any, @Param('id') id: string) {
    return this.bankAccountsService.canDelete(req.user.company_id, id);
  }

  @Post()
  @Audit('bank_account.created', 'bank_account')
  @ApiOperation({ summary: 'Crear cuenta bancaria' })
  @ApiBody({ type: Object, description: 'Datos de la cuenta bancaria' })
  @ApiResponse({ status: 201, description: 'Cuenta bancaria creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Request() req: any, @Body() dto: CreateBankAccountDto): Promise<any> {
    return this.bankAccountsService.create(req.user.company_id, dto);
  }

  @Put(':id')
  @Audit('bank_account.updated', 'bank_account')
  @ApiOperation({ summary: 'Actualizar cuenta bancaria' })
  @ApiBody({ type: Object, description: 'Datos a actualizar' })
  @ApiResponse({ status: 200, description: 'Cuenta bancaria actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cuenta bancaria no encontrada' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<any> {
    return this.bankAccountsService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @Audit('bank_account.deleted', 'bank_account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar cuenta bancaria' })
  @ApiResponse({ status: 200, description: 'Cuenta bancaria eliminada' })
  @ApiResponse({ status: 404, description: 'Cuenta bancaria no encontrada' })
  @ApiResponse({ status: 409, description: 'No se puede eliminar (tiene movimientos)' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.bankAccountsService.delete(req.user.company_id, id);
  }
}
