import { Controller, Get, Post, Put, Delete, Query, Req, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos con jerarquía NC/ND' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'doc_type', required: false, enum: ['INVOICE', 'INVOICE_CREDIT_NOTE', 'INVOICE_DEBIT_NOTE'] })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PENDING', 'PAID'] })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('doc_type') docType?: string,
    @Query('status') status?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = req.user.company_id;
    return this.documentsService.findAll(companyId, {
      search: search || undefined,
      docType: docType || undefined,
      status: status || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('catalogs/type-operations')
  @ApiOperation({ summary: 'Listar tipos de operación DIAN' })
  async getTypeOperations(@Req() req: any) {
    return this.documentsService.getTypeOperations(req.user.company_id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear documento (borrador o pendiente)' })
  async create(
    @Req() req: any,
    @Body() dto: CreateDocumentDto,
  ) {
    const companyId = req.user.company_id;
    return this.documentsService.create(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar documento borrador' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateDocumentDto,
  ) {
    const companyId = req.user.company_id;
    return this.documentsService.update(companyId, id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle completo de un documento' })
  async findById(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const companyId = req.user.company_id;
    return this.documentsService.findById(companyId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento borrador' })
  async deleteDraft(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const companyId = req.user.company_id;
    return this.documentsService.deleteDraft(companyId, id);
  }
}
