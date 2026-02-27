import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PayrollConceptsService } from './payroll-concepts.service';
import { UpdateConceptDto } from './dto';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';

@ApiTags('Conceptos de Nómina')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll-concepts')
export class PayrollConceptsController {
  constructor(private readonly conceptsService: PayrollConceptsService) {}

  @Get()
  @RequirePermissions('payroll_concepts.view')
  @ApiOperation({ summary: 'Listar todos los conceptos de nómina agrupados por tipo' })
  @ApiResponse({ status: 200, description: 'Lista de conceptos agrupados' })
  async findAll(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.conceptsService.findAll(companyId);
  }

  @Get(':key')
  @RequirePermissions('payroll_concepts.view')
  @ApiOperation({ summary: 'Obtener un concepto por key' })
  @ApiParam({ name: 'key', description: 'Key del concepto (ej: salary, eps_deduction)' })
  @ApiResponse({ status: 200, description: 'Concepto encontrado' })
  @ApiResponse({ status: 404, description: 'Concepto no encontrado' })
  async findOne(@Request() req: any, @Param('key') key: string) {
    const companyId = req.user.company_id;
    return this.conceptsService.findOne(companyId, key);
  }

  @Put(':key')
  @RequirePermissions('payroll_concepts.edit')
  @Audit('payroll_concept.updated', 'payroll_concept')
  @ApiOperation({ summary: 'Actualizar cuentas contables y configuración de un concepto' })
  @ApiParam({ name: 'key', description: 'Key del concepto' })
  @ApiResponse({ status: 200, description: 'Concepto actualizado' })
  @ApiResponse({ status: 404, description: 'Concepto no encontrado' })
  async update(
    @Request() req: any,
    @Param('key') key: string,
    @Body() dto: UpdateConceptDto,
  ) {
    const companyId = req.user.company_id;
    return this.conceptsService.update(companyId, key, dto);
  }

}
