import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@contagracia/shared-modules';
import { PagesService } from '../services/pages.service';

@ApiTags('cms-public')
@Public()
@Controller('cms')
export class CmsPublicController {
  constructor(private readonly pagesService: PagesService) {}

  @Get('pages/:slug')
  @ApiOperation({
    summary: 'Obtener página pública por slug (con secciones activas)',
  })
  @ApiResponse({ status: 200, description: 'Página encontrada' })
  @ApiResponse({ status: 404, description: 'Página no encontrada' })
  findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }

  @Get('navigation')
  @ApiOperation({
    summary: 'Obtener navegación del sitio (header + footer)',
  })
  @ApiResponse({ status: 200, description: 'Navegación del sitio' })
  getNavigation() {
    return this.pagesService.getNavigation();
  }
}
