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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ThirdPartiesService } from './third-parties.service';
import { CreateThirdPartyDto, UpdateThirdPartyDto } from './dto';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('Third Parties (Terceros)')

@Controller('third-parties')
export class ThirdPartiesController {
  constructor(private readonly thirdPartiesService: ThirdPartiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar terceros con filtros y paginación' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o NIT' })
  @ApiQuery({ name: 'role', required: false, description: 'Filtrar por rol' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'include_roles', required: false, description: 'Incluir solo terceros con al menos uno de estos roles (separados por coma)' })
  @ApiQuery({ name: 'exclude_roles', required: false, description: 'Roles a excluir (separados por coma)' })
  @ApiResponse({ status: 200, description: 'Lista de terceros' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('is_active') is_active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('include_roles') include_roles?: string,
    @Query('exclude_roles') exclude_roles?: string,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.thirdPartiesService.findAll(companyId, companyId, {
      search,
      role,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      include_roles: include_roles ? include_roles.split(',') : undefined,
      exclude_roles: exclude_roles ? exclude_roles.split(',') : undefined,
    });
  }

  @Get('exists/:identificationNumber')
  @ApiOperation({ summary: 'Verificar si existe un tercero por número de identificación' })
  @ApiParam({ name: 'identificationNumber', description: 'Número de identificación a verificar' })
  @ApiResponse({ status: 200, description: 'Resultado de la verificación' })
  async exists(
    @Request() req: any,
    @Param('identificationNumber') identificationNumber: string,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.thirdPartiesService.exists(companyId, companyId, identificationNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tercero por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del tercero' })
  @ApiResponse({ status: 404, description: 'Tercero no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.thirdPartiesService.findOne(companyId, companyId, id);
  }

  @Post()
  @Audit('third_party.created', 'third_party')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo tercero' })
  @ApiResponse({ status: 201, description: 'Tercero creado' })
  @ApiResponse({ status: 409, description: 'Ya existe un tercero con ese NIT' })
  async create(@Request() req: any, @Body() dto: CreateThirdPartyDto): Promise<any> {
    const companyId = req.user.company_id;
    return this.thirdPartiesService.create(companyId, companyId, dto);
  }

  @Put(':id')
  @Audit('third_party.updated', 'third_party')
  @ApiOperation({ summary: 'Actualizar un tercero' })
  @ApiResponse({ status: 200, description: 'Tercero actualizado' })
  @ApiResponse({ status: 404, description: 'Tercero no encontrado' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateThirdPartyDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.thirdPartiesService.update(companyId, companyId, id, dto);
  }

  @Delete(':id')
  @Audit('third_party.deleted', 'third_party')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un tercero' })
  @ApiResponse({ status: 200, description: 'Tercero desactivado' })
  @ApiResponse({ status: 404, description: 'Tercero no encontrado' })
  async remove(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.thirdPartiesService.remove(companyId, companyId, id);
  }
}
