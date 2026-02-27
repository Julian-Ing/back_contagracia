import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntryItemType, JournalEntryItemRefType } from '@prisma/client-tenant';

interface CreateJournalEntryDto {
  date: string;
  description?: string;
  type_key: string;
  reference_id?: string;
  due_date?: string;
  items: {
    account_code: string;
    amount: number;
    type: JournalEntryItemType;
    description?: string;
    third_party_id?: string;
    bank_account_id?: string;
    reference_type?: JournalEntryItemRefType;
    reference_id?: string;
    pair_id?: string;
  }[];
}

@ApiTags('journal-entries')
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar asientos contables con búsqueda y paginación' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por consecutivo o descripción' })
  @ApiQuery({ name: 'type_key', required: false, description: 'Filtrar por tipo de asiento' })
  @ApiQuery({ name: 'from_date', required: false, description: 'Fecha desde (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to_date', required: false, description: 'Fecha hasta (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 50)' })
  @ApiResponse({ status: 200, description: 'Lista de asientos contables' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('type_key') type_key?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.journalEntriesService.findAll(req.user.company_id, {
      search,
      type_key,
      from_date,
      to_date,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('types')
  @ApiOperation({ summary: 'Listar tipos de asientos para filtros' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de asientos' })
  async findAllTypes(@Request() req: any): Promise<any> {
    return this.journalEntriesService.findAllTypes(req.user.company_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener asiento contable por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del asiento contable' })
  @ApiResponse({ status: 404, description: 'Asiento contable no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.journalEntriesService.findOne(req.user.company_id, id);
  }

  @Post()
  @Audit('journal_entry.created', 'journal_entry')
  @ApiOperation({ summary: 'Crear asiento contable' })
  @ApiBody({ type: Object, description: 'Datos del asiento contable' })
  @ApiResponse({ status: 201, description: 'Asiento contable creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o asiento no balanceado' })
  async create(@Request() req: any, @Body() dto: CreateJournalEntryDto) {
    return this.journalEntriesService.create(req.user.company_id, dto);
  }

  @Post(':id/reverse')
  @Audit('journal_entry.reversed', 'journal_entry')
  @ApiOperation({ summary: 'Reversar asiento contable' })
  @ApiBody({ schema: { properties: { date: { type: 'string', format: 'date', description: 'Fecha del asiento de reversión (YYYY-MM-DD)' } } } })
  @ApiResponse({ status: 201, description: 'Asiento reversado exitosamente' })
  @ApiResponse({ status: 404, description: 'Asiento no encontrado' })
  @ApiResponse({ status: 409, description: 'El asiento ya fue reversado' })
  async reverse(@Request() req: any, @Param('id') id: string, @Body() body: { date?: string }) {
    const reversalDate = body.date ? new Date(body.date) : new Date();
    return this.journalEntriesService.reverseComplete(req.user.company_id, id, reversalDate);
  }

  @Post(':id/duplicate')
  @Audit('journal_entry.duplicated', 'journal_entry')
  @ApiOperation({ summary: 'Duplicar asiento contable' })
  @ApiBody({ schema: { properties: { date: { type: 'string', format: 'date', description: 'Fecha del asiento duplicado (YYYY-MM-DD)' } } } })
  @ApiResponse({ status: 201, description: 'Asiento duplicado exitosamente' })
  @ApiResponse({ status: 404, description: 'Asiento no encontrado' })
  async duplicate(@Request() req: any, @Param('id') id: string, @Body() body: { date?: string }) {
    const duplicateDate = body.date ? new Date(body.date) : new Date();
    return this.journalEntriesService.duplicate(req.user.company_id, id, duplicateDate);
  }
}
