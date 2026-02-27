import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CompanyId } from '@contagracia/shared-modules';
import { TypeDocumentsService } from './type-documents.service';

@ApiTags('Type Documents')
@Controller('type-documents')
export class TypeDocumentsController {
  constructor(private readonly typeDocumentsService: TypeDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tipos de documento con búsqueda fuzzy' })
  findAll(
    @CompanyId() companyId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    return this.typeDocumentsService.findAll(companyId, search, pageNum, limitNum);
  }
}
