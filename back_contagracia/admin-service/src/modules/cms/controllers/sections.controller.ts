import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SectionsService } from '../services/sections.service';
import {
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
} from '../dto';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('cms-sections')
@ApiBearerAuth('JWT-auth')
@Controller('admin/cms')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get('pages/:pageId/sections')
  @ApiOperation({ summary: 'Listar secciones de una página' })
  @ApiResponse({ status: 200, description: 'Lista de secciones' })
  @ApiResponse({ status: 404, description: 'Página no encontrada' })
  findByPage(@Param('pageId') pageId: string) {
    return this.sectionsService.findByPage(pageId);
  }

  @Get('sections/:id')
  @ApiOperation({ summary: 'Obtener una sección por ID' })
  @ApiResponse({ status: 200, description: 'Sección encontrada' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  findOne(@Param('id') id: string) {
    return this.sectionsService.findOne(id);
  }

  @Post('pages/:pageId/sections')
  @Audit('section.created', 'section')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una sección en una página' })
  @ApiResponse({ status: 201, description: 'Sección creada' })
  @ApiResponse({ status: 404, description: 'Página no encontrada' })
  create(
    @Param('pageId') pageId: string,
    @Body() createDto: CreateSectionDto,
  ) {
    return this.sectionsService.create(pageId, createDto);
  }

  @Patch('sections/:id')
  @Audit('section.updated', 'section')
  @ApiOperation({ summary: 'Actualizar una sección' })
  @ApiResponse({ status: 200, description: 'Sección actualizada' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  update(@Param('id') id: string, @Body() updateDto: UpdateSectionDto) {
    return this.sectionsService.update(id, updateDto);
  }

  @Delete('sections/:id')
  @Audit('section.deleted', 'section')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una sección' })
  @ApiResponse({ status: 200, description: 'Sección eliminada' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  remove(@Param('id') id: string) {
    return this.sectionsService.remove(id);
  }

  @Patch('sections/reorder')
  @Audit('section.reordered', 'section')
  @ApiOperation({ summary: 'Reordenar secciones' })
  @ApiResponse({ status: 200, description: 'Secciones reordenadas' })
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.sectionsService.reorder(dto);
  }

  @Patch('sections/:id/toggle')
  @Audit('section.toggled', 'section')
  @ApiOperation({ summary: 'Toggle visibilidad de una sección' })
  @ApiResponse({ status: 200, description: 'Visibilidad actualizada' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  toggle(@Param('id') id: string) {
    return this.sectionsService.toggle(id);
  }
}
