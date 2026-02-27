import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Body,
  StreamableFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, Audit, Public, JwtOptionalGuard } from '@contagracia/shared-modules';
import { MediaService } from './media.service';
import { MediaAccessGuard } from './media-access.guard';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';

@ApiTags('media')
@ApiBearerAuth('JWT-auth')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @Audit('media.upload', 'media')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  @ApiOperation({ summary: 'Subir un archivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'category'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: [
            'company_logo',
            'company_signature',
            'employee_document',
            'cms_image',
            'blog_image',
            'site_asset',
            'certificate',
            'general',
          ],
        },
        visibility: {
          type: 'string',
          enum: ['public', 'company', 'private'],
        },
      },
    },
  })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    if (!file) {
      throw new Error('No se recibió ningún archivo');
    }
    return this.mediaService.upload(file, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar archivos con filtros' })
  async list(
    @Query() query: QueryMediaDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.mediaService.list(query, user);
  }

  @Get(':id')
  @Public()
  @UseGuards(JwtOptionalGuard, MediaAccessGuard)
  @ApiOperation({
    summary: 'Descargar/ver un archivo (JWT requerido excepto archivos públicos)',
  })
  @ApiParam({ name: 'id', description: 'ID del archivo (UUID)' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const companyId = req.user?.company_id ?? null;
    const { buffer, mimeType, originalName } =
      await this.mediaService.getFileStream(id, companyId);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
      'Cache-Control': 'private, max-age=3600',
    });

    return new StreamableFile(buffer);
  }

  @Get(':id/info')
  @Public()
  @UseGuards(JwtOptionalGuard, MediaAccessGuard)
  @ApiOperation({ summary: 'Obtener metadata de un archivo' })
  @ApiParam({ name: 'id', description: 'ID del archivo (UUID)' })
  async info(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<any> {
    const companyId = req.user?.company_id ?? null;
    return this.mediaService.getInfo(id, companyId);
  }

  @Delete(':id')
  @Audit('media.delete', 'media')
  @ApiOperation({ summary: 'Eliminar un archivo (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del archivo (UUID)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.mediaService.softDelete(id, user);
  }
}
