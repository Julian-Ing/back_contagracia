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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { BlogPostsService } from './blog-posts.service';
import { CreatePostDto, UpdatePostDto } from './dto';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('blog')
@ApiBearerAuth('JWT-auth')
@Controller('admin/blog/posts')
export class BlogPostsController {
  constructor(private readonly postsService: BlogPostsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar posts con paginación y filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tag_id', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['published', 'draft', 'all'],
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tag_id') tag_id?: string,
    @Query('status') status?: string,
  ) {
    return this.postsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      tag_id,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un post por ID' })
  @ApiResponse({ status: 200, description: 'Post encontrado' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  @Audit('blog_post.created', 'blog_post')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo post' })
  @ApiResponse({ status: 201, description: 'Post creado' })
  @ApiResponse({ status: 409, description: 'Slug duplicado' })
  create(@Body() createDto: CreatePostDto) {
    return this.postsService.create(createDto);
  }

  @Patch(':id')
  @Audit('blog_post.updated', 'blog_post')
  @ApiOperation({ summary: 'Actualizar un post' })
  @ApiResponse({ status: 200, description: 'Post actualizado' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePostDto) {
    return this.postsService.update(id, updateDto);
  }

  @Delete(':id')
  @Audit('blog_post.deleted', 'blog_post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un post' })
  @ApiResponse({ status: 200, description: 'Post eliminado' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
