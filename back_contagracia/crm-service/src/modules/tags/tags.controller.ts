import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@ApiTags('CRM Tags')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @RequirePermissions('crm.tags.view')
  @ApiOperation({ summary: 'Listar tags' })
  async findAll(@Param('companyId') companyId: string) {
    return this.tagsService.findAll(companyId);
  }

  @Post()
  @RequirePermissions('crm.tags.edit')
  @Audit('crm.tags.create', 'CrmContactTag')
  @ApiOperation({ summary: 'Crear tag' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.tagsService.create(companyId, dto);
  }

  @Patch(':id')
  @RequirePermissions('crm.tags.edit')
  @Audit('crm.tags.edit', 'CrmContactTag')
  @ApiOperation({ summary: 'Actualizar tag' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.tags.delete')
  @Audit('crm.tags.delete', 'CrmContactTag')
  @ApiOperation({ summary: 'Eliminar tag (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.tagsService.remove(companyId, id);
  }
}
