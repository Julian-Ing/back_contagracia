import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto';

@Injectable()
export class BlogCommentsService {
  constructor(private prisma: PrismaService) {}

  async findByPost(postId: string) {
    return this.prisma.blogComment.findMany({
      where: { post_id: postId },
      orderBy: { created_at: 'desc' },
      include: {
        replies: {
          orderBy: { created_at: 'asc' },
          include: {
            replies: {
              orderBy: { created_at: 'asc' },
            },
          },
        },
      },
    });
  }

  async findApprovedByPost(postId: string) {
    // Get top-level comments only (no parent), build tree
    const comments = await this.prisma.blogComment.findMany({
      where: { post_id: postId, is_approved: true, parent_id: null },
      orderBy: { created_at: 'desc' },
      include: {
        replies: {
          where: { is_approved: true },
          orderBy: { created_at: 'asc' },
          include: {
            replies: {
              where: { is_approved: true },
              orderBy: { created_at: 'asc' },
            },
          },
        },
      },
    });

    return comments;
  }

  async create(postId: string, createDto: CreateCommentDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    // If parent_id provided, don't allow rating
    const data: any = {
      post_id: postId,
      author_name: createDto.author_name,
      author_email: createDto.author_email,
      content: createDto.content,
      parent_id: createDto.parent_id || null,
      rating: createDto.parent_id ? null : createDto.rating || null,
    };

    const comment = await this.prisma.blogComment.create({ data });

    // Update analytics
    await this.updateCommentAnalytics(postId);

    return comment;
  }

  async toggleApproval(id: string) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    const updated = await this.prisma.blogComment.update({
      where: { id },
      data: { is_approved: !comment.is_approved },
    });

    await this.updateCommentAnalytics(comment.post_id);

    return updated;
  }

  async remove(id: string) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id },
    });
    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    await this.prisma.blogComment.delete({ where: { id } });
    await this.updateCommentAnalytics(comment.post_id);

    return { message: 'Comentario eliminado' };
  }

  private async updateCommentAnalytics(postId: string) {
    const [commentsCount, ratingData] = await Promise.all([
      this.prisma.blogComment.count({
        where: { post_id: postId, is_approved: true },
      }),
      this.prisma.blogComment.aggregate({
        where: {
          post_id: postId,
          is_approved: true,
          rating: { not: null },
          parent_id: null,
        },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    await this.prisma.blogAnalytics.upsert({
      where: { post_id: postId },
      create: {
        post_id: postId,
        comments_count: commentsCount,
        average_rating: ratingData._avg.rating || 0,
        total_ratings: ratingData._count.rating,
      },
      update: {
        comments_count: commentsCount,
        average_rating: ratingData._avg.rating || 0,
        total_ratings: ratingData._count.rating,
      },
    });
  }
}
