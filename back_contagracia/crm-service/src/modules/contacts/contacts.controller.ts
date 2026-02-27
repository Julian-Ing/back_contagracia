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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { AssignTagsDto } from './dto/assign-tags.dto';

@ApiTags('CRM Contacts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequirePermissions('crm.contacts.view')
  @ApiOperation({ summary: 'Listar contactos con filtros y paginación' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'segment', required: false })
  @ApiQuery({ name: 'tagId', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('segment') segment?: string,
    @Query('tagId') tagId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.contactsService.findAll(companyId, {
      search,
      segment,
      tagId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('crm.contacts.view')
  @ApiOperation({ summary: 'Obtener contacto por ID con relaciones' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.findOne(companyId, id);
  }

  @Post()
  @RequirePermissions('crm.contacts.create')
  @Audit('crm.contacts.create', 'ThirdParty')
  @ApiOperation({ summary: 'Crear contacto' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateContactDto,
    @Request() req: any,
  ) {
    return this.contactsService.create(companyId, dto, req.user.sub);
  }

  @Patch(':id')
  @RequirePermissions('crm.contacts.edit')
  @Audit('crm.contacts.edit', 'ThirdParty')
  @ApiOperation({ summary: 'Actualizar contacto' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @Request() req: any,
  ) {
    return this.contactsService.update(companyId, id, dto, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('crm.contacts.delete')
  @Audit('crm.contacts.delete', 'ThirdParty')
  @ApiOperation({ summary: 'Eliminar contacto (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.remove(companyId, id);
  }

  @Post(':id/tags')
  @RequirePermissions('crm.contacts.edit')
  @Audit('crm.contacts.assign_tags', 'ThirdParty')
  @ApiOperation({ summary: 'Asignar tags a un contacto' })
  async assignTags(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AssignTagsDto,
  ) {
    return this.contactsService.assignTags(companyId, id, dto.tagIds);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('crm.contacts.edit')
  @Audit('crm.contacts.remove_tag', 'ThirdParty')
  @ApiOperation({ summary: 'Remover tag de un contacto' })
  async removeTag(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.contactsService.removeTag(companyId, id, tagId);
  }
}
