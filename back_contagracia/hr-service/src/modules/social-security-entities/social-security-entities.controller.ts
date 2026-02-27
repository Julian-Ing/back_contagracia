import {
  Controller,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SocialSecurityEntitiesService } from './social-security-entities.service';
import { JwtAuthGuard, RequirePermissions } from '@contagracia/shared-modules';

@ApiTags('Entidades de Seguridad Social (HR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-security')
export class SocialSecurityEntitiesController {
  constructor(private readonly socialSecurityService: SocialSecurityEntitiesService) {}

  /**
   * Listar todas las entidades de seguridad social agrupadas
   * Permiso: employees.view
   */
  @Get()
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar todas las entidades de seguridad social' })
  @ApiResponse({ status: 200, description: 'Entidades agrupadas por tipo' })
  async findAll(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAll(companyId, companyId);
  }

  /**
   * Listar EPS
   * Permiso: employees.view
   */
  @Get('eps')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar EPS disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de EPS' })
  async findAllEps(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllEps(companyId, companyId);
  }

  /**
   * Listar Fondos de Pensiones
   * Permiso: employees.view
   */
  @Get('pension-funds')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar Fondos de Pensiones disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de Fondos de Pensiones' })
  async findAllPensionFunds(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllPensionFunds(companyId, companyId);
  }

  /**
   * Listar ARL
   * Permiso: employees.view
   */
  @Get('arl')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar ARL disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de ARL' })
  async findAllArl(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllArl(companyId, companyId);
  }

  /**
   * Listar Cajas de Compensación
   * Permiso: employees.view
   */
  @Get('compensation-funds')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar Cajas de Compensación disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de Cajas de Compensación' })
  async findAllCompensationFunds(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllCompensationFunds(companyId, companyId);
  }

  /**
   * Listar Fondos de Cesantías
   * Permiso: employees.view
   */
  @Get('severance-funds')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar Fondos de Cesantías disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de Fondos de Cesantías' })
  async findAllSeveranceFunds(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllSeveranceFunds(companyId, companyId);
  }

  /**
   * Listar niveles de riesgo ARL
   * Permiso: employees.view
   */
  @Get('arl-risks')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar niveles de riesgo ARL' })
  @ApiResponse({ status: 200, description: 'Lista de niveles de riesgo' })
  async findAllArlRisks(@Request() req: any): Promise<any[]> {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllArlRisks(companyId, companyId);
  }

  /**
   * Listar tipos de contrato
   * Permiso: employees.view
   */
  @Get('contract-types')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar tipos de contrato' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de contrato' })
  async findAllContractTypes(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllContractTypes(companyId, companyId);
  }

  /**
   * Listar tipos de trabajador
   * Permiso: employees.view
   */
  @Get('worker-types')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar tipos de trabajador DIAN' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de trabajador' })
  async findAllWorkerTypes(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllWorkerTypes(companyId, companyId);
  }

  /**
   * Listar subtipos de trabajador
   * Permiso: employees.view
   */
  @Get('worker-subtypes')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar subtipos de trabajador' })
  @ApiResponse({ status: 200, description: 'Lista de subtipos de trabajador' })
  async findAllWorkerSubtypes(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllWorkerSubtypes(companyId, companyId);
  }

  /**
   * Listar centros de costo
   * Permiso: employees.view
   */
  @Get('cost-centers')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar centros de costo' })
  @ApiResponse({ status: 200, description: 'Lista de centros de costo' })
  async findAllCostCenters(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.socialSecurityService.findAllCostCenters(companyId, companyId);
  }
}
