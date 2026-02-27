import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BlogCommentsService } from './blog-comments.service';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('blog')
@ApiBearerAuth('JWT-auth')
@Controller('admin/blog')
export class BlogCommentsController {
  constructor(private readonly commentsService: BlogCommentsService) {}

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Listar comentarios de un post (admin)' })
  findByPost(@Param('postId') postId: string) {
    return this.commentsService.findByPost(postId);
  }

  @Patch('comments/:id/approve')
  @Audit('blog_comment.approval_toggled', 'blog_comment')
  @ApiOperation({ summary: 'Toggle aprobar/desaprobar comentario' })
  toggleApproval(@Param('id') id: string) {
    return this.commentsService.toggleApproval(id);
  }

  @Delete('comments/:id')
  @Audit('blog_comment.deleted', 'blog_comment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar comentario' })
  @ApiResponse({ status: 200, description: 'Comentario eliminado' })
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}
