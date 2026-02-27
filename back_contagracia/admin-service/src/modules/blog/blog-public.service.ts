import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToggleReactionDto, UpdateReadingSessionDto } from './dto';

@Injectable()
export class BlogPublicService {
  constructor(private prisma: PrismaService) {}

  async findPublishedPosts(query: {
    page?: number;
    limit?: number;
    search?: string;
    tag_ids?: string;
    sort_by?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 6;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
      published_at: { not: null },
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tag_ids) {
      const tagIds = query.tag_ids.split(',');
      where.post_tags = { some: { tag_id: { in: tagIds } } };
    }

    let orderBy: any = { published_at: 'desc' };
    if (query.sort_by === 'date_asc') orderBy = { published_at: 'asc' };
    else if (query.sort_by === 'title_asc') orderBy = { title: 'asc' };
    else if (query.sort_by === 'title_desc') orderBy = { title: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featured_image: true,
          published_at: true,
          created_at: true,
          content: true,
          post_tags: { include: { tag: true } },
          analytics: {
            select: {
              views_count: true,
              comments_count: true,
              average_rating: true,
            },
          },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: data.map((post) => ({
        ...post,
        // Calculate reading time: ~200 words per minute from content
        reading_time: post.content
          ? Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))
          : 1,
        content: undefined, // Don't send full content in list
        tags: post.post_tags.map((pt) => pt.tag),
        post_tags: undefined,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findPostBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        post_tags: { include: { tag: true } },
        analytics: true,
        author: { select: { id: true, full_name: true } },
      },
    });

    if (!post || !post.published_at || !post.is_active) {
      throw new NotFoundException('Post no encontrado');
    }

    return {
      ...post,
      reading_time: post.content
        ? Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))
        : 1,
      tags: post.post_tags.map((pt) => pt.tag),
      post_tags: undefined,
    };
  }

  async registerView(slug: string, visitorId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');

    await this.prisma.blogView.create({
      data: { post_id: post.id, visitor_id: visitorId },
    });

    // Update analytics
    const [totalViews, uniqueViews] = await Promise.all([
      this.prisma.blogView.count({ where: { post_id: post.id } }),
      this.prisma.blogView
        .groupBy({ by: ['visitor_id'], where: { post_id: post.id } })
        .then((r) => r.length),
    ]);

    await this.prisma.blogAnalytics.upsert({
      where: { post_id: post.id },
      create: { post_id: post.id, views_count: totalViews, unique_views: uniqueViews },
      update: { views_count: totalViews, unique_views: uniqueViews },
    });

    return { message: 'Vista registrada' };
  }

  async getEngagementStats(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');

    const [reactionsData, bookmarksCount, readingData, completedCount] =
      await Promise.all([
        this.prisma.blogReaction.groupBy({
          by: ['reaction_type'],
          where: { post_id: post.id },
          _count: true,
        }),
        this.prisma.blogBookmark.count({ where: { post_id: post.id } }),
        this.prisma.blogReadingSession.aggregate({
          where: { post_id: post.id },
          _avg: { reading_time_seconds: true },
          _count: true,
        }),
        this.prisma.blogReadingSession.count({
          where: { post_id: post.id, completed_reading: true },
        }),
      ]);

    const totalSessions = readingData._count || 1;

    return {
      likes_count:
        reactionsData.find((r) => r.reaction_type === 'like')?._count || 0,
      dislikes_count:
        reactionsData.find((r) => r.reaction_type === 'dislike')?._count || 0,
      bookmarks_count: bookmarksCount,
      avg_reading_time_minutes: Math.round(
        (readingData._avg.reading_time_seconds || 0) / 60,
      ),
      completion_rate_percentage: Math.round(
        (completedCount / totalSessions) * 100,
      ),
    };
  }

  async toggleReaction(slug: string, dto: ToggleReactionDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');

    const existing = await this.prisma.blogReaction.findUnique({
      where: {
        post_id_visitor_id: {
          post_id: post.id,
          visitor_id: dto.visitor_id,
        },
      },
    });

    if (existing) {
      if (existing.reaction_type === dto.reaction_type) {
        // Same reaction → remove
        await this.prisma.blogReaction.delete({ where: { id: existing.id } });
        return { action: 'removed', reaction_type: dto.reaction_type };
      } else {
        // Different reaction → update
        await this.prisma.blogReaction.update({
          where: { id: existing.id },
          data: { reaction_type: dto.reaction_type },
        });
        return { action: 'changed', reaction_type: dto.reaction_type };
      }
    } else {
      // No existing → create
      await this.prisma.blogReaction.create({
        data: {
          post_id: post.id,
          visitor_id: dto.visitor_id,
          reaction_type: dto.reaction_type,
        },
      });
      return { action: 'added', reaction_type: dto.reaction_type };
    }
  }

  async toggleBookmark(slug: string, visitorId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');

    const existing = await this.prisma.blogBookmark.findUnique({
      where: {
        post_id_visitor_id: {
          post_id: post.id,
          visitor_id: visitorId,
        },
      },
    });

    if (existing) {
      await this.prisma.blogBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    } else {
      await this.prisma.blogBookmark.create({
        data: { post_id: post.id, visitor_id: visitorId },
      });
      return { bookmarked: true };
    }
  }

  async updateReadingSession(slug: string, dto: UpdateReadingSessionDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post no encontrado');

    // Find existing session for this visitor+post
    const existing = await this.prisma.blogReadingSession.findFirst({
      where: { post_id: post.id, visitor_id: dto.visitor_id },
      orderBy: { created_at: 'desc' },
    });

    if (existing) {
      await this.prisma.blogReadingSession.update({
        where: { id: existing.id },
        data: {
          reading_time_seconds: dto.reading_time_seconds,
          scroll_percentage: dto.scroll_percentage,
          completed_reading:
            dto.completed_reading || dto.scroll_percentage >= 80,
          session_end: new Date(),
        },
      });
    } else {
      await this.prisma.blogReadingSession.create({
        data: {
          post_id: post.id,
          visitor_id: dto.visitor_id,
          reading_time_seconds: dto.reading_time_seconds,
          scroll_percentage: dto.scroll_percentage,
          completed_reading:
            dto.completed_reading || dto.scroll_percentage >= 80,
        },
      });
    }

    return { message: 'Reading session actualizada' };
  }

  async getVisitorBookmarks(visitorId: string) {
    const bookmarks = await this.prisma.blogBookmark.findMany({
      where: {
        visitor_id: visitorId,
        post: { is_active: true, published_at: { not: null } },
      },
      orderBy: { created_at: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            featured_image: true,
            published_at: true,
            content: true,
            post_tags: { include: { tag: true } },
            analytics: {
              select: {
                views_count: true,
                comments_count: true,
                average_rating: true,
              },
            },
          },
        },
      },
    });

    return bookmarks.map((b) => ({
      bookmarked_at: b.created_at,
      ...b.post,
      reading_time: b.post.content
        ? Math.max(1, Math.ceil(b.post.content.split(/\s+/).length / 200))
        : 1,
      content: undefined,
      tags: b.post.post_tags.map((pt) => pt.tag),
      post_tags: undefined,
    }));
  }

  async getPublicTags() {
    return this.prisma.blogTag.findMany({
      where: { is_active: true },
      include: { _count: { select: { post_tags: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async trackTagClick(tagId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.blogTagAnalytics.upsert({
      where: { tag_id_date: { tag_id: tagId, date: today } },
      create: { tag_id: tagId, date: today, clicks: 1 },
      update: { clicks: { increment: 1 } },
    });

    return { message: 'Click registrado' };
  }
}
