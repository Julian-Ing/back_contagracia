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
import {
  CompanyPaymentMethodsService,
  CreateCompanyPaymentMethodDto,
  UpdateCompanyPaymentMethodDto,
} from './company-payment-methods.service';

@ApiTags('company-payment-methods')
@Controller('company-payment-methods')
export class CompanyPaymentMethodsController {
  constructor(
    private readonly service: CompanyPaymentMethodsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar métodos de pago de la empresa' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'includeInactive', required: false })
  @ApiResponse({ status: 200, description: 'Lista de métodos de pago' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Listar métodos de pago DIAN disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de códigos DIAN' })
  async getPaymentMethods(@Request() req: any) {
    return this.service.getPaymentMethods(req.user.company_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener método de pago por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del método' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.company_id, id);
  }

  @Post()
  @Audit('company_payment_method.created', 'company_payment_method')
  @ApiOperation({ summary: 'Crear método de pago' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 201, description: 'Método creado' })
  async create(
    @Request() req: any,
    @Body() dto: CreateCompanyPaymentMethodDto,
  ) {
    return this.service.create(req.user.company_id, dto);
  }

  @Put(':id')
  @Audit('company_payment_method.updated', 'company_payment_method')
  @ApiOperation({ summary: 'Actualizar método de pago' })
  @ApiBody({ type: Object })
  @ApiResponse({ status: 200, description: 'Método actualizado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyPaymentMethodDto,
  ) {
    return this.service.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @Audit('company_payment_method.deleted', 'company_payment_method')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar método de pago' })
  @ApiResponse({ status: 200, description: 'Método eliminado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  @ApiResponse({ status: 409, description: 'En uso, no se puede eliminar' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.company_id, id);
  }
}
