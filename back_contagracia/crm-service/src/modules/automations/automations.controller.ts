import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiProperty,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';

class TestEmailDto {
  @ApiProperty({ example: 'test@ejemplo.com', description: 'Email destinatario' })
  @IsEmail()
  to!: string;

  @ApiProperty({ example: 'Prueba desde CRM', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Hola, esto es un mensaje de prueba', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

import { AutomationsService } from './automations.service';
import { EmailSenderService } from './services/email-sender.service';
import {
  CreateOpportunityAutomationDto,
  UpdateOpportunityAutomationDto,
} from './dto/opportunity-automation.dto';
import {
  CreateActivityAutomationDto,
  UpdateActivityAutomationDto,
} from './dto/activity-automation.dto';
import {
  CreateFormAutomationDto,
  UpdateFormAutomationDto,
} from './dto/form-automation.dto';

@ApiTags('CRM Automations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/automations')
export class AutomationsController {
  constructor(
    private readonly automationsService: AutomationsService,
    private readonly emailSender: EmailSenderService,
  ) {}

  // ============================================
  // Opportunity Automations (Mensajes)
  // ============================================

  @Get('opportunity')
  @RequirePermissions('crm.automations.view')
  @ApiOperation({
    summary: 'Listar automatizaciones de oportunidad',
    description: 'Obtiene todas las automatizaciones de mensajes (email/WhatsApp) que se disparan al cambiar etapa de una oportunidad',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Lista de automatizaciones de oportunidad' })
  async findAllOpportunity(@Param('companyId') companyId: string) {
    return this.automationsService.findAllOpportunity(companyId);
  }

  @Get('opportunity/:id')
  @RequirePermissions('crm.automations.view')
  @ApiOperation({
    summary: 'Obtener automatización de oportunidad',
    description: 'Obtiene una automatización de mensaje específica por ID',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización encontrada' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async findOneOpportunity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.findOneOpportunity(companyId, id);
  }

  @Post('opportunity')
  @RequirePermissions('crm.automations.create')
  @Audit('crm.automations.create_opportunity', 'CrmOpportunityAutomation')
  @ApiOperation({
    summary: 'Crear automatización de oportunidad',
    description: 'Crea una nueva automatización que envía email/WhatsApp cuando una oportunidad cambia de etapa',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 201, description: 'Automatización creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async createOpportunity(
    @Param('companyId') companyId: string,
    @Body() dto: CreateOpportunityAutomationDto,
  ) {
    return this.automationsService.createOpportunity(companyId, dto);
  }

  @Patch('opportunity/:id')
  @RequirePermissions('crm.automations.edit')
  @Audit('crm.automations.edit_opportunity', 'CrmOpportunityAutomation')
  @ApiOperation({
    summary: 'Actualizar automatización de oportunidad',
    description: 'Actualiza los campos de una automatización existente',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización actualizada' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async updateOpportunity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityAutomationDto,
  ) {
    return this.automationsService.updateOpportunity(companyId, id, dto);
  }

  @Patch('opportunity/:id/toggle')
  @RequirePermissions('crm.automations.toggle')
  @Audit('crm.automations.toggle_opportunity', 'CrmOpportunityAutomation')
  @ApiOperation({
    summary: 'Activar/desactivar automatización de oportunidad',
    description: 'Cambia el estado is_active de la automatización',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  async toggleOpportunity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.toggleOpportunity(companyId, id);
  }

  @Delete('opportunity/:id')
  @RequirePermissions('crm.automations.delete')
  @Audit('crm.automations.delete_opportunity', 'CrmOpportunityAutomation')
  @ApiOperation({
    summary: 'Eliminar automatización de oportunidad',
    description: 'Soft delete - marca la automatización como eliminada (deleted_at)',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización eliminada' })
  async removeOpportunity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.removeOpportunity(companyId, id);
  }

  // ============================================
  // Activity Automations (Crear actividades)
  // ============================================

  @Get('activity')
  @RequirePermissions('crm.automations.view')
  @ApiOperation({
    summary: 'Listar automatizaciones de actividad',
    description: 'Obtiene todas las automatizaciones que crean actividades (llamadas, tareas, etc.) al cambiar etapa',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Lista de automatizaciones de actividad' })
  async findAllActivity(@Param('companyId') companyId: string) {
    return this.automationsService.findAllActivity(companyId);
  }

  @Get('activity/:id')
  @RequirePermissions('crm.automations.view')
  @ApiOperation({
    summary: 'Obtener automatización de actividad',
    description: 'Obtiene una automatización de actividad específica por ID',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización encontrada' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async findOneActivity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.findOneActivity(companyId, id);
  }

  @Post('activity')
  @RequirePermissions('crm.automations.create')
  @Audit('crm.automations.create_activity', 'CrmActivityAutomation')
  @ApiOperation({
    summary: 'Crear automatización de actividad',
    description: 'Crea una automatización que genera actividades (llamadas, reuniones, tareas) cuando cambia la etapa de una oportunidad',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 201, description: 'Automatización creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async createActivity(
    @Param('companyId') companyId: string,
    @Body() dto: CreateActivityAutomationDto,
  ) {
    return this.automationsService.createActivity(companyId, dto);
  }

  @Patch('activity/:id')
  @RequirePermissions('crm.automations.edit')
  @Audit('crm.automations.edit_activity', 'CrmActivityAutomation')
  @ApiOperation({
    summary: 'Actualizar automatización de actividad',
    description: 'Actualiza los campos de una automatización de actividad',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización actualizada' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async updateActivity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateActivityAutomationDto,
  ) {
    return this.automationsService.updateActivity(companyId, id, dto);
  }

  @Patch('activity/:id/toggle')
  @RequirePermissions('crm.automations.toggle')
  @Audit('crm.automations.toggle_activity', 'CrmActivityAutomation')
  @ApiOperation({
    summary: 'Activar/desactivar automatización de actividad',
    description: 'Cambia el estado is_active de la automatización',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  async toggleActivity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.toggleActivity(companyId, id);
  }

  @Delete('activity/:id')
  @RequirePermissions('crm.automations.delete')
  @Audit('crm.automations.delete_activity', 'CrmActivityAutomation')
  @ApiOperation({
    summary: 'Eliminar automatización de actividad',
    description: 'Soft delete - marca la automatización como eliminada',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización eliminada' })
  async removeActivity(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.removeActivity(companyId, id);
  }

  // ============================================
  // Form Automations (Al enviar formulario)
  // ============================================

  @Get('form')
  @RequirePermissions('crm.automations.view')
  @ApiOperation({
    summary: 'Listar automatizaciones de formulario',
    description: 'Obtiene todas las automatizaciones que se ejecutan al enviar un formulario (crear lead, oportunidad, etc.)',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Lista de automatizaciones de formulario' })
  async findAllForm(@Param('companyId') companyId: string) {
    return this.automationsService.findAllForm(companyId);
  }

  @Get('form/:id')
  @RequirePermissions('crm.automations.view')
  @ApiOperation({
    summary: 'Obtener automatización de formulario',
    description: 'Obtiene una automatización de formulario específica por ID',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización encontrada' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async findOneForm(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.findOneForm(companyId, id);
  }

  @Post('form')
  @RequirePermissions('crm.automations.create')
  @Audit('crm.automations.create_form', 'CrmFormAutomation')
  @ApiOperation({
    summary: 'Crear automatización de formulario',
    description: 'Crea una automatización que se ejecuta al enviar un formulario (crear lead, oportunidad, asignar usuario)',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 201, description: 'Automatización creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async createForm(
    @Param('companyId') companyId: string,
    @Body() dto: CreateFormAutomationDto,
  ) {
    return this.automationsService.createForm(companyId, dto);
  }

  @Patch('form/:id')
  @RequirePermissions('crm.automations.edit')
  @Audit('crm.automations.edit_form', 'CrmFormAutomation')
  @ApiOperation({
    summary: 'Actualizar automatización de formulario',
    description: 'Actualiza los campos de una automatización de formulario',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización actualizada' })
  @ApiResponse({ status: 404, description: 'Automatización no encontrada' })
  async updateForm(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFormAutomationDto,
  ) {
    return this.automationsService.updateForm(companyId, id, dto);
  }

  @Patch('form/:id/toggle')
  @RequirePermissions('crm.automations.toggle')
  @Audit('crm.automations.toggle_form', 'CrmFormAutomation')
  @ApiOperation({
    summary: 'Activar/desactivar automatización de formulario',
    description: 'Cambia el estado is_active de la automatización',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  async toggleForm(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.toggleForm(companyId, id);
  }

  @Delete('form/:id')
  @RequirePermissions('crm.automations.delete')
  @Audit('crm.automations.delete_form', 'CrmFormAutomation')
  @ApiOperation({
    summary: 'Eliminar automatización de formulario',
    description: 'Elimina permanentemente la automatización de formulario',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiParam({ name: 'id', description: 'ID de la automatización' })
  @ApiResponse({ status: 200, description: 'Automatización eliminada' })
  async removeForm(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.automationsService.removeForm(companyId, id);
  }

  // ============================================
  // Automation Logs
  // ============================================

  @Get('logs')
  @RequirePermissions('crm.automations.view')
  @ApiOperation({
    summary: 'Obtener logs de ejecución de automatizaciones',
    description: 'Historial de ejecuciones de automatizaciones con filtros opcionales por tipo, estado, etc.',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiQuery({ name: 'automation_type', required: false, enum: ['opportunity', 'activity', 'form', 'event', 'reminder'], description: 'Filtrar por tipo de automatización' })
  @ApiQuery({ name: 'automation_id', required: false, description: 'Filtrar por ID de automatización específica' })
  @ApiQuery({ name: 'status', required: false, enum: ['success', 'failed', 'skipped'], description: 'Filtrar por estado de ejecución' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset para paginación' })
  @ApiResponse({ status: 200, description: 'Lista de logs de automatización' })
  async getLogs(
    @Param('companyId') companyId: string,
    @Query('automation_type') automationType?: string,
    @Query('automation_id') automationId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.automationsService.getLogs(companyId, {
      automation_type: automationType,
      automation_id: automationId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ============================================
  // Email Test (Development)
  // ============================================

  @Post('test-email')
  @RequirePermissions('crm.automations.test')
  @Audit('crm.automations.test_email', 'CrmAutomation')
  @ApiOperation({
    summary: 'Enviar email de prueba',
    description: 'Endpoint de desarrollo para probar el envío de emails. Usa la configuración SMTP del tenant o el fallback de Gmail.',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Email enviado exitosamente' })
  @ApiResponse({ status: 500, description: 'Error al enviar email' })
  async testEmail(
    @Param('companyId') companyId: string,
    @Body() body: TestEmailDto,
  ) {
    const result = await this.emailSender.send(companyId, {
      to: body.to,
      subject: body.subject || 'Test Email - Contagracia CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Email de Prueba</h2>
          <p>${body.message || 'Este es un email de prueba del sistema de automatizaciones de Contagracia CRM.'}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Enviado desde: Contagracia CRM<br>
            Fecha: ${new Date().toLocaleString('es-ES')}
          </p>
        </div>
      `,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      sentTo: body.to,
      timestamp: new Date().toISOString(),
    };
  }
}
