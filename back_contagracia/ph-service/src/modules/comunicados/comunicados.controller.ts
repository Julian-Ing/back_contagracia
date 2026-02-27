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
import { ComunicadosService } from './comunicados.service';
import { CreateComunicadoDto, UpdateComunicadoDto } from './dto';

@ApiTags('PH Comunicados')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/comunicados')
export class ComunicadosController {
  constructor(private readonly service: ComunicadosService) {}

  /**
   * Permission: ph.comunicados.view
   */
  @Get()
  @ApiOperation({ summary: 'Listar comunicados' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll(companyId, {
      condominium_id: condominiumId,
      status,
      search,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Permission: ph.comunicados.view
   */
  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de comunicados' })
  @ApiQuery({ name: 'condominium_id', required: false })
  async getStats(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
  ) {
    return this.service.getStats(companyId, condominiumId);
  }

  /**
   * Permission: ph.comunicados.create
   */
  @Get('preview-recipients')
  @ApiOperation({ summary: 'Preview destinatarios por copropiedad y roles' })
  @ApiQuery({ name: 'condominium_id', required: true })
  @ApiQuery({ name: 'roles', required: true, description: 'Comma-separated: owner,tenant' })
  async previewRecipients(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId: string,
    @Query('roles') roles: string,
  ) {
    const targetRoles = roles.split(',').map((r) => r.trim()).filter(Boolean);
    return this.service.resolveRecipients(companyId, condominiumId, targetRoles);
  }

  /**
   * Permission: ph.comunicados.view
   */
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de comunicado con destinatarios' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  /**
   * Permission: ph.comunicados.create
   */
  @Post()
  @ApiOperation({ summary: 'Crear comunicado (borrador)' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateComunicadoDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.sub);
  }

  /**
   * Permission: ph.comunicados.create
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Editar comunicado (solo borrador)' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateComunicadoDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  /**
   * Permission: ph.comunicados.create
   */
  @Post(':id/send')
  @ApiOperation({ summary: 'Enviar comunicado masivo' })
  async send(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.send(companyId, id, req.user.sub);
  }

  /**
   * Permission: ph.comunicados.delete
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar comunicado' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
