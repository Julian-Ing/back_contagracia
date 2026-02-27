import { Controller, Get, Post, Patch, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { ProductTransfersService } from './product-transfers.service';
import { CreateProductTransferDto, RejectProductTransferDto } from './dto';

@ApiTags('product-transfers')
@Controller('product-transfers')
export class ProductTransfersController {
  constructor(private readonly service: ProductTransfersService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('product_id') product_id?: string,
  ) {
    return this.service.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      product_id,
    });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.company_id, id);
  }

  @Post()
  @Audit('product_transfer.created', 'product_transfer')
  async create(@Request() req: any, @Body() dto: CreateProductTransferDto) {
    return this.service.create(req.user.company_id, req.user.tenant_user_id, dto);
  }

  @Patch(':id/approve')
  @Audit('product_transfer.approved', 'product_transfer')
  @HttpCode(HttpStatus.OK)
  async approve(@Request() req: any, @Param('id') id: string) {
    return this.service.approve(req.user.company_id, req.user.tenant_user_id, id);
  }

  @Patch(':id/reject')
  @Audit('product_transfer.rejected', 'product_transfer')
  @HttpCode(HttpStatus.OK)
  async reject(@Request() req: any, @Param('id') id: string, @Body() dto: RejectProductTransferDto) {
    return this.service.reject(req.user.company_id, req.user.tenant_user_id, id, dto.rejection_reason);
  }
}
