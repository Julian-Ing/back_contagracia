import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { PqrsService } from './pqrs.service';
import { CreatePqrsDto, UpdatePqrsDto, CreateMessageDto } from './dto';

@ApiTags('PH PQRS')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/pqrs')
export class PqrsController {
  constructor(private readonly service: PqrsService) {}

  // ─── CRUD PQRS ─────────────────────────────────────────

  /**
   * Permission: ph.pqrs.view
   */
  @Get()
  @ApiOperation({ summary: 'Listar PQRS' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll(companyId, {
      condominium_id: condominiumId,
      type,
      status,
      search,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Permission: ph.pqrs.view
   */
  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas PQRS' })
  @ApiQuery({ name: 'condominium_id', required: false })
  async getStats(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
  ) {
    return this.service.getStats(companyId, condominiumId);
  }

  /**
   * Permission: ph.pqrs.view
   */
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de PQRS con mensajes' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  /**
   * Permission: ph.pqrs.create
   */
  @Post()
  @ApiOperation({ summary: 'Crear PQRS' })
  @Audit('pqrs.created', 'pqrs')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePqrsDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.pqrs.edit
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar PQRS' })
  @Audit('pqrs.updated', 'pqrs')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePqrsDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  /**
   * Permission: ph.pqrs.edit
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del PQRS' })
  @Audit('pqrs.status_changed', 'pqrs')
  async changeStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.service.changeStatus(companyId, id, status, req.user.sub);
  }

  /**
   * Permission: ph.pqrs.delete
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar PQRS' })
  @Audit('pqrs.deleted', 'pqrs')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.remove(companyId, id, req.user.sub);
  }

  // ─── Mensajes ──────────────────────────────────────────

  /**
   * Permission: ph.pqrs.view
   */
  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensajes del PQRS' })
  async getMessages(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.getMessages(companyId, id);
  }

  /**
   * Permission: ph.pqrs.respond
   */
  @Post(':id/messages')
  @ApiOperation({ summary: 'Agregar mensaje al PQRS' })
  @Audit('pqrs_message.created', 'pqrs_message')
  async addMessage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @Request() req: any,
  ) {
    return this.service.addMessage(companyId, id, dto, req.user.sub);
  }
}
