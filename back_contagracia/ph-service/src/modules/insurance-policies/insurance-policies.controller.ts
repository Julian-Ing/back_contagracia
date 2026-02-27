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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { InsurancePoliciesService } from './insurance-policies.service';
import { CreateInsurancePolicyDto, UpdateInsurancePolicyDto } from './dto';

@ApiTags('PH Insurance Policies')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/insurance-policies')
export class InsurancePoliciesController {
  constructor(private readonly service: InsurancePoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar polizas de seguro' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'policy_type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('policy_type') policyType?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll(companyId, {
      condominium_id: condominiumId,
      policy_type: policyType,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener poliza por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear poliza de seguro' })
  @Audit('insurance_policy.created', 'insurance_policy')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateInsurancePolicyDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar poliza de seguro' })
  @Audit('insurance_policy.updated', 'insurance_policy')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInsurancePolicyDto,
    @Request() req: any,
  ) {
    return this.service.update(companyId, id, dto, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar poliza de seguro' })
  @Audit('insurance_policy.deleted', 'insurance_policy')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  // ─── Insurer History (N:M) ───

  @Get(':policyId/insurers')
  @ApiOperation({ summary: 'Listar historial de aseguradoras de una poliza' })
  async findPolicyInsurers(
    @Param('companyId') companyId: string,
    @Param('policyId') policyId: string,
  ) {
    return this.service.findPolicyInsurers(companyId, policyId);
  }

  @Post(':policyId/insurers')
  @ApiOperation({ summary: 'Agregar aseguradora al historial de una poliza' })
  @Audit('policy_insurer.created', 'policy_insurer')
  async addPolicyInsurer(
    @Param('companyId') companyId: string,
    @Param('policyId') policyId: string,
    @Body() body: { third_party_id: string; role?: string; start_date: string; end_date?: string; notes?: string },
    @Request() req: any,
  ) {
    return this.service.addPolicyInsurer(companyId, policyId, body, req.user.sub);
  }

  @Delete('insurers/:insurerId')
  @ApiOperation({ summary: 'Eliminar registro del historial de aseguradoras' })
  @Audit('policy_insurer.deleted', 'policy_insurer')
  async removePolicyInsurer(
    @Param('companyId') companyId: string,
    @Param('insurerId') insurerId: string,
  ) {
    return this.service.removePolicyInsurer(companyId, insurerId);
  }
}
