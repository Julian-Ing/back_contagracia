import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BlogTagsService } from './blog-tags.service';
import { CreateTagDto, UpdateTagDto } from './dto';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('blog')
@ApiBearerAuth('JWT-auth')
@Controller('admin/blog/tags')
export class BlogTagsController {
  constructor(private readonly tagsService: BlogTagsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tags con conteo de posts' })
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tag por ID' })
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Post()
  @Audit('blog_tag.created', 'blog_tag')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo tag' })
  @ApiResponse({ status: 201, description: 'Tag creado' })
  @ApiResponse({ status: 409, description: 'Nombre o slug duplicado' })
  create(@Body() createDto: CreateTagDto) {
    return this.tagsService.create(createDto);
  }

  @Patch(':id')
  @Audit('blog_tag.updated', 'blog_tag')
  @ApiOperation({ summary: 'Actualizar un tag' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTagDto) {
    return this.tagsService.update(id, updateDto);
  }

  @Delete(':id')
  @Audit('blog_tag.deleted', 'blog_tag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un tag' })
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
