import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProjectionsService } from './projections.service';
import { CreateProjectionDto, UpdateProjectionDto } from './dto';

@ApiTags('projections')
@Controller('projections')
export class ProjectionsController {
  constructor(private readonly projectionsService: ProjectionsService) {}

  @Get('movement-types')
  @ApiOperation({ summary: 'Listar tipos de movimiento disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de movimiento' })
  async getMovementTypes(@Request() req: any) {
    return this.projectionsService.getMovementTypes(req.user.company_id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proyecciones con filtros' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'scope', required: false, enum: ['GLOBAL', 'COST_CENTER'] })
  @ApiQuery({ name: 'cost_center_id', required: false })
  @ApiResponse({ status: 200, description: 'Lista de proyecciones' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('scope') scope?: string,
    @Query('cost_center_id') cost_center_id?: string,
  ) {
    return this.projectionsService.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      scope: scope as 'GLOBAL' | 'COST_CENTER' | undefined,
      cost_center_id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proyección por ID' })
  @ApiResponse({ status: 200, description: 'Proyección encontrada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    return this.projectionsService.findOne(req.user.company_id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear proyección' })
  @ApiResponse({ status: 201, description: 'Proyección creada' })
  async create(@Request() req: any, @Body() dto: CreateProjectionDto) {
    return this.projectionsService.create(req.user.company_id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar proyección' })
  @ApiResponse({ status: 200, description: 'Proyección actualizada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProjectionDto,
  ) {
    return this.projectionsService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar proyección' })
  @ApiResponse({ status: 200, description: 'Proyección eliminada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  @ApiResponse({ status: 400, description: 'Tiene sub-proyecciones' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.projectionsService.delete(req.user.company_id, id);
  }
}
