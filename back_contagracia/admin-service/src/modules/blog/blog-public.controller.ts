import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Audit, Public } from '@contagracia/shared-modules';
import { BlogPublicService } from './blog-public.service';
import { BlogCommentsService } from './blog-comments.service';
import {
  CreateCommentDto,
  ToggleReactionDto,
  UpdateReadingSessionDto,
} from './dto';

@ApiTags('blog-public')
@Public()
@Controller('blog')
export class BlogPublicController {
  constructor(
    private readonly publicService: BlogPublicService,
    private readonly commentsService: BlogCommentsService,
  ) {}

  @Get('posts')
  @ApiOperation({ summary: 'Listar posts publicados' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tag_ids', required: false, type: String })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['date_desc', 'date_asc', 'title_asc', 'title_desc'],
  })
  findPublished(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tag_ids') tag_ids?: string,
    @Query('sort_by') sort_by?: string,
  ) {
    return this.publicService.findPublishedPosts({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      tag_ids,
      sort_by,
    });
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Obtener post por slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.publicService.findPostBySlug(slug);
  }

  @Audit('blog.post_viewed', 'blog_post')
  @Post('posts/:slug/view')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar vista de un post' })
  registerView(
    @Param('slug') slug: string,
    @Body('visitor_id') visitorId: string,
  ) {
    return this.publicService.registerView(slug, visitorId);
  }

  @Get('posts/:slug/comments')
  @ApiOperation({ summary: 'Listar comentarios aprobados de un post' })
  getComments(@Param('slug') slug: string) {
    // Need to get post id from slug first
    return this.publicService.findPostBySlug(slug).then((post) =>
      this.commentsService.findApprovedByPost(post.id),
    );
  }

  @Audit('blog.comment_created', 'blog_comment')
  @Post('posts/:slug/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear comentario en un post' })
  createComment(
    @Param('slug') slug: string,
    @Body() createDto: CreateCommentDto,
  ) {
    return this.publicService.findPostBySlug(slug).then((post) =>
      this.commentsService.create(post.id, createDto),
    );
  }

  @Get('posts/:slug/engagement')
  @ApiOperation({ summary: 'Stats de engagement de un post' })
  getEngagement(@Param('slug') slug: string) {
    return this.publicService.getEngagementStats(slug);
  }

  @Audit('blog.reaction_added', 'blog_post')
  @Post('posts/:slug/reaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like/dislike en un post' })
  toggleReaction(
    @Param('slug') slug: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.publicService.toggleReaction(slug, dto);
  }

  @Audit('blog.bookmark_toggled', 'blog_post')
  @Post('posts/:slug/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle bookmark en un post' })
  toggleBookmark(
    @Param('slug') slug: string,
    @Body('visitor_id') visitorId: string,
  ) {
    return this.publicService.toggleBookmark(slug, visitorId);
  }

  @Audit('blog.reading_session', 'blog_post')
  @Post('posts/:slug/reading-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar reading session' })
  updateReadingSession(
    @Param('slug') slug: string,
    @Body() dto: UpdateReadingSessionDto,
  ) {
    return this.publicService.updateReadingSession(slug, dto);
  }

  @Get('bookmarks')
  @ApiOperation({ summary: 'Listar posts guardados por un visitante' })
  @ApiQuery({ name: 'visitor_id', required: true, type: String })
  getVisitorBookmarks(@Query('visitor_id') visitorId: string) {
    return this.publicService.getVisitorBookmarks(visitorId);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Listar tags públicos con conteo de posts' })
  getTags() {
    return this.publicService.getPublicTags();
  }

  @Audit('blog.tag_clicked', 'blog_tag')
  @Post('tags/:id/click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar click en un tag' })
  trackTagClick(@Param('id') id: string) {
    return this.publicService.trackTagClick(id);
  }
}
