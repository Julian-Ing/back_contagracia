import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { FeeConceptsService } from './fee-concepts.service';
import { CreateFeeConceptDto } from './dto/create-fee-concept.dto';
import { UpdateFeeConceptDto } from './dto/update-fee-concept.dto';

@ApiTags('PH Fee Concepts')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/fee-concepts')
export class FeeConceptsController {
  constructor(private readonly feeConceptsService: FeeConceptsService) {}

  /**
   * Permission: ph.fee_concepts.view
   * Listar conceptos de cobro
   */
  @Get()
  @ApiOperation({ summary: 'Listar conceptos de cobro' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o código' })
  @ApiQuery({ name: 'is_active', required: false, description: 'Filtrar por estado activo' })
  @ApiQuery({ name: 'is_recurring', required: false, description: 'Filtrar por recurrente' })
  @ApiQuery({ name: 'skip', required: false, description: 'Registros a saltar (paginación)' })
  @ApiQuery({ name: 'take', required: false, description: 'Registros a tomar (paginación)' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
    @Query('is_recurring') is_recurring?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.feeConceptsService.findAll(companyId, {
      search,
      is_active,
      is_recurring,
      skip,
      take,
    });
  }

  /**
   * Permission: ph.fee_concepts.view
   * Obtener concepto de cobro por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener concepto de cobro por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.feeConceptsService.findOne(companyId, id);
  }

  /**
   * Permission: ph.fee_concepts.create
   * Crear concepto de cobro
   */
  @Post()
  @ApiOperation({ summary: 'Crear concepto de cobro' })
  @Audit('fee_concept.created', 'fee_concept')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateFeeConceptDto,
  ) {
    return this.feeConceptsService.create(companyId, dto);
  }

  /**
   * Permission: ph.fee_concepts.edit
   * Actualizar concepto de cobro
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar concepto de cobro' })
  @Audit('fee_concept.updated', 'fee_concept')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFeeConceptDto,
  ) {
    return this.feeConceptsService.update(companyId, id, dto);
  }

  /**
   * Permission: ph.fee_concepts.delete
   * Eliminar concepto de cobro (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar concepto de cobro (soft delete)' })
  @Audit('fee_concept.deleted', 'fee_concept')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.feeConceptsService.remove(companyId, id);
  }
}
