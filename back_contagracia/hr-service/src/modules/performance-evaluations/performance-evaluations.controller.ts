import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PerformanceEvaluationsService } from './performance-evaluations.service';
import { EvaluationsAnalysisService } from './evaluations-analysis.service';
import {
  CreateEvaluationDto,
  UpdateEvaluationDto,
  QueryEvaluationsDto,
  GenerateEvaluationsDto,
  QueryAnalysisDto,
} from './dto';
import {
  RequirePermissions,
  RequireAnyPermission,
  Audit,
} from '@contagracia/shared-modules';

@ApiTags('Evaluaciones de Desempeno (HR)')
@ApiBearerAuth()
@Controller('evaluations')
export class PerformanceEvaluationsController {
  constructor(
    private readonly service: PerformanceEvaluationsService,
    private readonly analysisService: EvaluationsAnalysisService,
  ) {}

  // ==================== ANÁLISIS (rutas antes de :id para evitar conflictos) ====================

  @Get('analysis/dashboard')
  @RequirePermissions('performance.view')
  @ApiOperation({ summary: 'Dashboard inteligente de desempeno' })
  @ApiResponse({ status: 200, description: 'Metricas de todos los empleados' })
  async getDashboard(@Request() req: any, @Query() query: QueryAnalysisDto): Promise<any> {
    const companyId = req.user.company_id;
    return this.analysisService.getDashboard(companyId, companyId, query);
  }

  @Get('analysis/employee/:profileId')
  @RequireAnyPermission('performance.view', 'performance.self_view')
  @ApiOperation({ summary: 'Analisis detallado de un empleado' })
  @ApiParam({ name: 'profileId', description: 'ID del perfil del empleado' })
  @ApiResponse({ status: 200, description: 'Metricas detalladas del empleado' })
  async getEmployeeAnalysis(
    @Request() req: any,
    @Param('profileId') profileId: string,
    @Query() query: QueryAnalysisDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('performance.view');
    return this.analysisService.getEmployeeAnalysis(companyId, companyId, userId, selfOnly, profileId, query);
  }

  @Post('generate')
  @RequirePermissions('performance.auto_generate')
  @Audit('evaluation.auto_generated', 'performance_evaluation')
  @ApiOperation({ summary: 'Generar evaluaciones automaticamente' })
  @ApiResponse({ status: 201, description: 'Evaluaciones generadas' })
  async generateEvaluations(@Request() req: any, @Body() dto: GenerateEvaluationsDto): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.analysisService.generateEvaluations(companyId, companyId, userId, dto);
  }

  // ==================== CRUD ====================

  @Get()
  @RequireAnyPermission('performance.view', 'performance.self_view')
  @ApiOperation({ summary: 'Listar evaluaciones de desempeno' })
  @ApiResponse({ status: 200, description: 'Lista paginada de evaluaciones' })
  async findAll(@Request() req: any, @Query() query: QueryEvaluationsDto): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('performance.view');
    return this.service.findAll(companyId, companyId, userId, selfOnly, query);
  }

  @Get(':id')
  @RequireAnyPermission('performance.view', 'performance.self_view')
  @ApiOperation({ summary: 'Obtener detalle de una evaluacion' })
  @ApiParam({ name: 'id', description: 'ID de la evaluacion' })
  @ApiResponse({ status: 200, description: 'Detalle de la evaluacion' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('performance.view');
    return this.service.findOne(companyId, companyId, userId, selfOnly, id);
  }

  @Post()
  @RequirePermissions('performance.create')
  @Audit('evaluation.created', 'performance_evaluation')
  @ApiOperation({ summary: 'Crear evaluacion de desempeno' })
  @ApiResponse({ status: 201, description: 'Evaluacion creada' })
  async create(@Request() req: any, @Body() dto: CreateEvaluationDto): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.create(companyId, companyId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('performance.edit')
  @Audit('evaluation.updated', 'performance_evaluation')
  @ApiOperation({ summary: 'Editar evaluacion de desempeno' })
  @ApiParam({ name: 'id', description: 'ID de la evaluacion' })
  @ApiResponse({ status: 200, description: 'Evaluacion actualizada' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.service.update(companyId, companyId, id, dto);
  }

  @Patch(':id/complete')
  @RequirePermissions('performance.complete')
  @Audit('evaluation.completed', 'performance_evaluation')
  @ApiOperation({ summary: 'Completar evaluacion' })
  @ApiParam({ name: 'id', description: 'ID de la evaluacion' })
  @ApiResponse({ status: 200, description: 'Evaluacion completada' })
  async complete(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.service.complete(companyId, companyId, id);
  }

  @Patch(':id/approve')
  @RequirePermissions('performance.approve')
  @Audit('evaluation.approved', 'performance_evaluation')
  @ApiOperation({ summary: 'Aprobar evaluacion' })
  @ApiParam({ name: 'id', description: 'ID de la evaluacion' })
  @ApiResponse({ status: 200, description: 'Evaluacion aprobada' })
  async approve(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.service.approve(companyId, companyId, id);
  }

  @Delete(':id')
  @RequirePermissions('performance.delete')
  @Audit('evaluation.deleted', 'performance_evaluation')
  @ApiOperation({ summary: 'Eliminar evaluacion de desempeno' })
  @ApiParam({ name: 'id', description: 'ID de la evaluacion' })
  @ApiResponse({ status: 200, description: 'Evaluacion eliminada' })
  async remove(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.service.remove(companyId, companyId, id);
  }
}
