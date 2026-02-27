import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { PayrollWithholdingUvtService } from './payroll-withholding-uvt.service';
import { JwtAuthGuard, RequirePermissions } from '@contagracia/shared-modules';

@ApiTags('Tabla UVT - Retención en la Fuente')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll-withholding-uvt')
export class PayrollWithholdingUvtController {
  constructor(private readonly uvtService: PayrollWithholdingUvtService) {}

  @Get()
  @RequirePermissions('payroll_uvt.view')
  @ApiOperation({ summary: 'Listar tramos UVT de retención en la fuente' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filtrar por año' })
  @ApiQuery({ name: 'procedure', required: false, type: Number, description: 'Filtrar por procedimiento (1 o 2)' })
  @ApiResponse({ status: 200, description: 'Lista de tramos UVT' })
  async findAll(
    @Request() req: any,
    @Query('year') year?: string,
    @Query('procedure') procedure?: string,
  ) {
    const companyId = req.user.company_id;
    return this.uvtService.findAll(
      companyId,
      year ? parseInt(year, 10) : undefined,
      procedure ? parseInt(procedure, 10) : undefined,
    );
  }

  @Post()
  @RequirePermissions('payroll_uvt.create')
  @ApiOperation({ summary: 'Crear un tramo UVT' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        year: { type: 'number', example: 2026 },
        procedure: { type: 'number', example: 1 },
        from_uvt: { type: 'number', example: 0 },
        to_uvt: { type: 'number', example: 95, nullable: true },
        fixed_fee_uvt: { type: 'number', example: 0 },
        marginal_rate: { type: 'number', example: 0.19 },
        subtract_uvt: { type: 'number', example: 0 },
      },
      required: ['year', 'from_uvt', 'marginal_rate'],
    },
  })
  @ApiResponse({ status: 201, description: 'Tramo creado' })
  async create(
    @Request() req: any,
    @Body() body: {
      year: number;
      procedure?: number;
      from_uvt: number;
      to_uvt?: number | null;
      fixed_fee_uvt?: number;
      marginal_rate: number;
      subtract_uvt?: number;
    },
  ) {
    const companyId = req.user.company_id;
    return this.uvtService.create(companyId, body);
  }

  @Post('replicate')
  @RequirePermissions('payroll_uvt.replicate')
  @ApiOperation({ summary: 'Replicar tramos UVT de un año a otro' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceYear: { type: 'number', description: 'Año origen', example: 2025 },
        targetYear: { type: 'number', description: 'Año destino', example: 2026 },
      },
      required: ['sourceYear', 'targetYear'],
    },
  })
  @ApiResponse({ status: 201, description: 'Tramos replicados exitosamente' })
  async replicate(
    @Request() req: any,
    @Body() body: { sourceYear: number; targetYear: number },
  ) {
    const companyId = req.user.company_id;
    return this.uvtService.replicate(companyId, body.sourceYear, body.targetYear);
  }

  @Put(':id')
  @RequirePermissions('payroll_uvt.edit')
  @ApiOperation({ summary: 'Actualizar un tramo UVT' })
  @ApiParam({ name: 'id', description: 'ID del tramo' })
  @ApiResponse({ status: 200, description: 'Tramo actualizado' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      from_uvt?: number;
      to_uvt?: number | null;
      fixed_fee_uvt?: number;
      marginal_rate?: number;
      subtract_uvt?: number;
    },
  ) {
    const companyId = req.user.company_id;
    return this.uvtService.update(companyId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('payroll_uvt.delete')
  @ApiOperation({ summary: 'Eliminar un tramo UVT' })
  @ApiParam({ name: 'id', description: 'ID del tramo' })
  @ApiResponse({ status: 200, description: 'Tramo eliminado' })
  async remove(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const companyId = req.user.company_id;
    return this.uvtService.remove(companyId, id);
  }

  @Get(':year')
  @RequirePermissions('payroll_uvt.view')
  @ApiOperation({ summary: 'Listar tramos UVT por año' })
  @ApiParam({ name: 'year', description: 'Año (ej: 2025)' })
  @ApiResponse({ status: 200, description: 'Tramos UVT del año' })
  async findByYear(
    @Request() req: any,
    @Param('year', ParseIntPipe) year: number,
  ) {
    const companyId = req.user.company_id;
    return this.uvtService.findByYear(companyId, year);
  }
}
