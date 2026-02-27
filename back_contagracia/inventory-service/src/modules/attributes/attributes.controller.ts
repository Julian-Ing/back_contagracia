import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { AttributesService } from './attributes.service';
import {
  CreateAttributeDto, UpdateAttributeDto, CreateAttributeOptionDto, UpdateAttributeOptionDto,
  BulkCreateAttributesDto, BulkCreateOptionsDto, BulkCreateWithOptionsDto,
} from './dto';

@ApiTags('attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  // ────── Atributos ──────

  @Get('for-select')
  async findForSelect(@Request() req: any) {
    return this.attributesService.findForSelect(req.user.company_id);
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.attributesService.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post()
  @Audit('attribute.created', 'attribute')
  async create(@Request() req: any, @Body() dto: CreateAttributeDto) {
    return this.attributesService.create(req.user.company_id, dto);
  }

  @Post('bulk')
  @Audit('attribute.bulk_created', 'attribute')
  async bulkCreate(@Request() req: any, @Body() dto: BulkCreateAttributesDto) {
    return this.attributesService.bulkCreateAttributes(req.user.company_id, dto);
  }

  @Post('bulk-with-options')
  @Audit('attribute.bulk_created_with_options', 'attribute')
  async bulkCreateWithOptions(@Request() req: any, @Body() dto: BulkCreateWithOptionsDto) {
    return this.attributesService.bulkCreateWithOptions(req.user.company_id, dto);
  }

  @Patch(':id')
  @Audit('attribute.updated', 'attribute')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributesService.update(req.user.company_id, id, dto);
  }

  @Patch(':id/toggle-active')
  @Audit('attribute.toggled_active', 'attribute')
  async toggleActive(@Request() req: any, @Param('id') id: string) {
    return this.attributesService.toggleActive(req.user.company_id, id);
  }

  @Delete(':id')
  @Audit('attribute.deleted', 'attribute')
  @HttpCode(HttpStatus.OK)
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.attributesService.delete(req.user.company_id, id);
  }

  // ────── Opciones de Atributo ──────

  @Post(':id/options')
  @Audit('attribute_option.created', 'attribute_option')
  async createOption(
    @Request() req: any,
    @Param('id') attributeId: string,
    @Body() dto: CreateAttributeOptionDto,
  ) {
    return this.attributesService.createOption(req.user.company_id, attributeId, dto);
  }

  @Post(':id/options/bulk')
  @Audit('attribute_option.bulk_created', 'attribute_option')
  async bulkCreateOptions(
    @Request() req: any,
    @Param('id') attributeId: string,
    @Body() dto: BulkCreateOptionsDto,
  ) {
    return this.attributesService.bulkCreateOptions(req.user.company_id, attributeId, dto);
  }

  @Patch('options/:optionId')
  @Audit('attribute_option.updated', 'attribute_option')
  async updateOption(
    @Request() req: any,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateAttributeOptionDto,
  ) {
    return this.attributesService.updateOption(req.user.company_id, optionId, dto);
  }

  @Patch('options/:optionId/toggle-active')
  @Audit('attribute_option.toggled_active', 'attribute_option')
  async toggleOptionActive(@Request() req: any, @Param('optionId') optionId: string) {
    return this.attributesService.toggleOptionActive(req.user.company_id, optionId);
  }

  @Delete('options/:optionId')
  @Audit('attribute_option.deleted', 'attribute_option')
  @HttpCode(HttpStatus.OK)
  async deleteOption(@Request() req: any, @Param('optionId') optionId: string) {
    return this.attributesService.deleteOption(req.user.company_id, optionId);
  }
}
