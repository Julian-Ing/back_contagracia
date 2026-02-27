import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { CreateTemplateTypeDto } from './dto/create-template-type.dto';
import { UpdateTemplateTypeDto } from './dto/update-template-type.dto';

@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('api')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  // --- Template Types ---

  @Get('email-template-types')
  @ApiOperation({ summary: 'Listar tipos de plantilla activos' })
  async findAllTypes(@Request() req: any) {
    return this.emailTemplatesService.findAllTypes(req.user.company_id);
  }

  @Post('email-template-types')
  @Audit('integrations.email_template_types.create', 'EmailTemplateType')
  @ApiOperation({ summary: 'Crear tipo de plantilla' })
  async createType(@Request() req: any, @Body() dto: CreateTemplateTypeDto) {
    return this.emailTemplatesService.createType(req.user.company_id, dto);
  }

  @Patch('email-template-types/:id')
  @Audit('integrations.email_template_types.edit', 'EmailTemplateType')
  @ApiOperation({ summary: 'Actualizar tipo de plantilla' })
  async updateType(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateTypeDto,
  ) {
    return this.emailTemplatesService.updateType(req.user.company_id, id, dto);
  }

  @Delete('email-template-types/:id')
  @Audit('integrations.email_template_types.delete', 'EmailTemplateType')
  @ApiOperation({ summary: 'Eliminar tipo de plantilla (soft delete)' })
  async removeType(@Request() req: any, @Param('id') id: string) {
    return this.emailTemplatesService.removeType(req.user.company_id, id);
  }

  // --- Templates ---

  @Get('email-templates')
  @ApiOperation({ summary: 'Listar plantillas de correo activas' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  async findAllTemplates(@Request() req: any) {
    return this.emailTemplatesService.findAllTemplates(req.user.company_id);
  }

  @Get('email-templates/by-module/:moduleKey')
  @ApiOperation({ summary: 'Listar plantillas por módulo' })
  async findTemplatesByModule(
    @Request() req: any,
    @Param('moduleKey') moduleKey: string,
  ) {
    return this.emailTemplatesService.findTemplatesByModule(
      req.user.company_id,
      moduleKey,
    );
  }

  @Post('email-templates')
  @Audit('integrations.email_templates.create', 'EmailTemplate')
  @ApiOperation({ summary: 'Crear plantilla de correo' })
  @ApiResponse({ status: 201, description: 'Plantilla creada' })
  async createTemplate(
    @Request() req: any,
    @Body() dto: CreateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.createTemplate(req.user.company_id, dto);
  }

  @Patch('email-templates/:id')
  @Audit('integrations.email_templates.edit', 'EmailTemplate')
  @ApiOperation({ summary: 'Actualizar plantilla de correo' })
  @ApiResponse({ status: 200, description: 'Plantilla actualizada' })
  async updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.updateTemplate(req.user.company_id, id, dto);
  }

  @Delete('email-templates/:id')
  @Audit('integrations.email_templates.delete', 'EmailTemplate')
  @ApiOperation({ summary: 'Eliminar plantilla de correo (soft delete)' })
  @ApiResponse({ status: 200, description: 'Plantilla eliminada' })
  async removeTemplate(@Request() req: any, @Param('id') id: string) {
    return this.emailTemplatesService.removeTemplate(req.user.company_id, id);
  }
}
