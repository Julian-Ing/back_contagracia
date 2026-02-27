import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { Public } from '@contagracia/shared-auth';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

@ApiTags('CRM Forms')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  @RequirePermissions('crm.forms.view')
  @ApiOperation({ summary: 'Listar formularios activos' })
  async findAll(@Param('companyId') companyId: string) {
    return this.formsService.findAll(companyId);
  }

  @Get(':id')
  @RequirePermissions('crm.forms.view')
  @ApiOperation({ summary: 'Obtener formulario con campos y conteo de envíos' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.formsService.findOne(companyId, id);
  }

  @Post()
  @RequirePermissions('crm.forms.create')
  @Audit('crm.forms.create', 'CrmLeadForm')
  @ApiOperation({ summary: 'Crear formulario con campos' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateFormDto,
  ) {
    return this.formsService.create(companyId, dto);
  }

  @Patch(':id')
  @RequirePermissions('crm.forms.edit')
  @Audit('crm.forms.edit', 'CrmLeadForm')
  @ApiOperation({ summary: 'Actualizar formulario y reemplazar campos' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.forms.delete')
  @Audit('crm.forms.delete', 'CrmLeadForm')
  @ApiOperation({ summary: 'Eliminar formulario (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.formsService.remove(companyId, id);
  }

  @Get(':id/submissions')
  @RequirePermissions('crm.forms.view_submissions')
  @ApiOperation({ summary: 'Listar envíos del formulario' })
  async findSubmissions(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.formsService.findSubmissions(
      companyId,
      id,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
  }
}

@ApiTags('CRM Forms - Public')
@Public()
@Controller('public/forms')
export class FormsPublicController {
  constructor(private readonly formsService: FormsService) {}

  @Get(':companyId/:slug')
  @ApiOperation({ summary: 'Obtener formulario público por slug' })
  async getPublicForm(
    @Param('companyId') companyId: string,
    @Param('slug') slug: string,
  ) {
    return this.formsService.findPublicForm(companyId, slug);
  }

  @Post(':companyId/:slug/submit')
  @ApiOperation({ summary: 'Envío público de formulario' })
  async submit(
    @Param('companyId') companyId: string,
    @Param('slug') slug: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.formsService.submitFormForCompany(companyId, slug, data, req.ip);
  }
}
