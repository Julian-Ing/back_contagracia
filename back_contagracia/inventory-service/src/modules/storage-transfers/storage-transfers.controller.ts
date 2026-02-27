import { Controller, Get, Post, Patch, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { StorageTransfersService } from './storage-transfers.service';
import { CreateStorageTransferDto, RejectStorageTransferDto } from './dto';

@ApiTags('storage-transfers')
@Controller('storage-transfers')
export class StorageTransfersController {
  constructor(private readonly service: StorageTransfersService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
    });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.company_id, id);
  }

  @Post()
  @Audit('storage_transfer.created', 'storage_transfer')
  async create(@Request() req: any, @Body() dto: CreateStorageTransferDto) {
    return this.service.create(req.user.company_id, req.user.tenant_user_id, dto);
  }

  @Patch(':id/approve')
  @Audit('storage_transfer.approved', 'storage_transfer')
  @HttpCode(HttpStatus.OK)
  async approve(@Request() req: any, @Param('id') id: string) {
    return this.service.approve(req.user.company_id, req.user.tenant_user_id, id);
  }

  @Patch(':id/reject')
  @Audit('storage_transfer.rejected', 'storage_transfer')
  @HttpCode(HttpStatus.OK)
  async reject(@Request() req: any, @Param('id') id: string, @Body() dto: RejectStorageTransferDto) {
    return this.service.reject(req.user.company_id, req.user.tenant_user_id, id, dto.rejection_reason);
  }
}
