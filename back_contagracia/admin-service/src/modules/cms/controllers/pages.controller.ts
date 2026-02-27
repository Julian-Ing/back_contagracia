import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PagesService } from '../services/pages.service';
import { CreatePageDto, UpdatePageDto } from '../dto';
import { Audit, Public } from '@contagracia/shared-modules';

@ApiTags('cms-pages')
@ApiBearerAuth('JWT-auth')
@Controller('admin/cms/pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar todas las páginas' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir páginas inactivas',
  })
  @ApiResponse({ status: 200, description: 'Lista de páginas' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.pagesService.findAll(includeInactive === 'true');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener página por ID con sus secciones' })
  @ApiResponse({ status: 200, description: 'Página encontrada' })
  @ApiResponse({ status: 404, description: 'Página no encontrada' })
  findOne(@Param('id') id: string) {
    return this.pagesService.findOne(id);
  }

  @Post()
  @Audit('page.created', 'page')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva página' })
  @ApiResponse({ status: 201, description: 'Página creada' })
  @ApiResponse({ status: 409, description: 'Slug ya existe' })
  create(@Body() createDto: CreatePageDto) {
    return this.pagesService.create(createDto);
  }

  @Patch(':id')
  @Audit('page.updated', 'page')
  @ApiOperation({ summary: 'Actualizar una página' })
  @ApiResponse({ status: 200, description: 'Página actualizada' })
  @ApiResponse({ status: 404, description: 'Página no encontrada' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePageDto) {
    return this.pagesService.update(id, updateDto);
  }

  @Delete(':id')
  @Audit('page.deleted', 'page')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una página' })
  @ApiResponse({ status: 200, description: 'Página eliminada' })
  @ApiResponse({ status: 404, description: 'Página no encontrada' })
  remove(@Param('id') id: string) {
    return this.pagesService.remove(id);
  }
}
