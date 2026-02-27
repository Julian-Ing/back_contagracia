import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, CreateCombinationsDto, SetProductAttributesDto, AdjustStockDto } from './dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('top-selling')
  async topSelling(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storage_id') storage_id?: string,
  ) {
    return this.productsService.topSelling(req.user.company_id, {
      limit: limit ? parseInt(limit) : undefined,
      from,
      to,
      storage_id,
    });
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category_id') category_id?: string,
    @Query('view_mode') view_mode?: string,
    @Query('is_service') is_service?: string,
    @Query('parent_product_id') parent_product_id?: string,
  ) {
    return this.productsService.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category_id,
      view_mode: view_mode as 'all' | 'products' | 'combinations' | undefined,
      is_service: is_service !== undefined ? is_service === 'true' : undefined,
      parent_product_id,
    });
  }

  @Get('for-select')
  async findForSelect(
    @Request() req: any,
    @Query('is_service') is_service?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findForSelect(req.user.company_id, {
      is_service: is_service === 'true' ? true : is_service === 'false' ? false : undefined,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('movement-types')
  async getMovementTypes(@Request() req: any) {
    return this.productsService.getMovementTypes(req.user.company_id);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.productsService.findOne(req.user.company_id, id);
  }

  @Post()
  @Audit('product.created', 'product')
  async create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.company_id, dto);
  }

  @Patch(':id')
  @Audit('product.updated', 'product')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @Audit('product.deleted', 'product')
  @HttpCode(HttpStatus.OK)
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.productsService.delete(req.user.company_id, id);
  }

  @Patch(':id/reactivate')
  @Audit('product.reactivated', 'product')
  async reactivate(@Request() req: any, @Param('id') id: string) {
    return this.productsService.reactivate(req.user.company_id, id);
  }

  @Post(':id/adjust-stock')
  @Audit('product.stock_adjusted', 'product')
  async adjustStock(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(req.user.company_id, req.user.id, id, dto);
  }

  @Post(':id/combinations')
  @Audit('product.combinations_created', 'product')
  async createCombinations(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCombinationsDto,
  ) {
    return this.productsService.createCombinations(req.user.company_id, id, dto);
  }

  @Get(':id/kardex')
  async getKardex(
    @Request() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('type_key') type_key?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getKardex(req.user.company_id, id, {
      search,
      type_key,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id/stock-summary')
  async getStockSummary(
    @Request() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getStockSummary(req.user.company_id, id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id/combination-fingerprints')
  async getCombinationFingerprints(@Request() req: any, @Param('id') id: string) {
    return this.productsService.getCombinationFingerprints(req.user.company_id, id);
  }

  @Get(':id/attributes')
  async getProductAttributes(@Request() req: any, @Param('id') id: string) {
    return this.productsService.getProductAttributes(req.user.company_id, id);
  }

  @Put(':id/attributes')
  @Audit('product.attributes_updated', 'product')
  async setProductAttributes(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SetProductAttributesDto,
  ) {
    return this.productsService.setProductAttributes(req.user.company_id, id, dto);
  }
}
