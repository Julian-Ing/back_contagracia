import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CompanyId, Audit } from '@contagracia/shared-modules';
import { ResolutionsService } from './resolutions.service';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { UpdateResolutionDto } from './dto/update-resolution.dto';

@ApiTags('Resolutions')
@Controller('resolutions')
export class ResolutionsController {
  constructor(private readonly resolutionsService: ResolutionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva resolución' })
  @Audit('resolution.created', 'resolution')
  create(@CompanyId() companyId: string, @Body() createDto: CreateResolutionDto) {
    return this.resolutionsService.create(companyId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las resoluciones' })
  findAll(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('type_document_id') typeDocumentId?: string,
    @Query('is_active') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.resolutionsService.findAll(companyId, search, typeDocumentId, isActiveBool, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener resolución por ID' })
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.resolutionsService.findOne(companyId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar resolución' })
  @Audit('resolution.updated', 'resolution')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateResolutionDto,
  ) {
    return this.resolutionsService.update(companyId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar resolución (soft delete)' })
  @Audit('resolution.deleted', 'resolution')
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.resolutionsService.remove(companyId, id);
  }
}
