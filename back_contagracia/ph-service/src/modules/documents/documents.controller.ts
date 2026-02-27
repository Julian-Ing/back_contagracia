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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto';

@ApiTags('PH Documents')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'category_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('category_id') categoryId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll(companyId, {
      condominium_id: condominiumId,
      category_id: categoryId,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('by-condominium/:condominiumId')
  @ApiOperation({ summary: 'Documentos de una copropiedad' })
  async findByCondominium(
    @Param('companyId') companyId: string,
    @Param('condominiumId') condominiumId: string,
  ) {
    return this.service.findByCondominium(companyId, condominiumId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener documento por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear documento (metadatos + file_url de media-service)' })
  @Audit('document.created', 'document')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateDocumentDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar documento' })
  @Audit('document.updated', 'document')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento' })
  @Audit('document.deleted', 'document')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
