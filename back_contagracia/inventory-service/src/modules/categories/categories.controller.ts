import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('for-select')
  @ApiOperation({ summary: 'Listar categorías para select (ligero)' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre' })
  @ApiResponse({ status: 200, description: 'Lista ligera de categorías {id, name}' })
  async findForSelect(
    @Request() req: any,
    @Query('search') search?: string,
  ) {
    return this.categoriesService.findForSelect(req.user.company_id, search);
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.categoriesService.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post()
  @Audit('category.created', 'category')
  async create(@Request() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(req.user.company_id, dto);
  }

  @Patch(':id')
  @Audit('category.updated', 'category')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @Audit('category.deleted', 'category')
  @HttpCode(HttpStatus.OK)
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.categoriesService.delete(req.user.company_id, id);
  }
}
