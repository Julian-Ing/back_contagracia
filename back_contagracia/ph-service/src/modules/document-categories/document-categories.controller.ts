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
import { DocumentCategoriesService } from './document-categories.service';
import { CreateDocumentCategoryDto, UpdateDocumentCategoryDto } from './dto';

@ApiTags('PH Document Categories')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/document-categories')
export class DocumentCategoriesController {
  constructor(private readonly service: DocumentCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías de documentos' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
  ) {
    return this.service.findAll(companyId, {
      search,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener categoría por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear categoría de documento' })
  @Audit('document_category.created', 'document_category')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateDocumentCategoryDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.sub);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Crear categorías por defecto si no existen' })
  @Audit('document_category.seeded', 'document_category')
  async seedDefaults(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    return this.service.seedDefaults(companyId, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar categoría' })
  @Audit('document_category.updated', 'document_category')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentCategoryDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar categoría (soft delete)' })
  @Audit('document_category.deleted', 'document_category')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
