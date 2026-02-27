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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las categorías con conteo de compañías' })
  @ApiResponse({ status: 200, description: 'Lista de categorías obtenida exitosamente' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una categoría por ID' })
  @ApiResponse({ status: 200, description: 'Categoría encontrada' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Audit('category.created', 'category')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con ese nombre' })
  create(@Body() createDto: CreateCategoryDto) {
    return this.categoriesService.create(createDto);
  }

  @Patch(':id')
  @Audit('category.updated', 'category')
  @ApiOperation({ summary: 'Actualizar una categoría existente' })
  @ApiResponse({ status: 200, description: 'Categoría actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe otra categoría con ese nombre' })
  update(@Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateDto);
  }

  @Delete(':id')
  @Audit('category.deleted', 'category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una categoría' })
  @ApiResponse({ status: 200, description: 'Categoría eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
