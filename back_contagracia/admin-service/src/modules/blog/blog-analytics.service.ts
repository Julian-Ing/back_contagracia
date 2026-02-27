import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [totalPosts, publishedPosts, analyticsAgg] = await Promise.all([
      this.prisma.blogPost.count({ where: { is_active: true } }),
      this.prisma.blogPost.count({
        where: { is_active: true, published_at: { not: null } },
      }),
      this.prisma.blogAnalytics.aggregate({
        _sum: { views_count: true, comments_count: true },
        _avg: { average_rating: true },
      }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts: totalPosts - publishedPosts,
      totalViews: analyticsAgg._sum.views_count || 0,
      totalComments: analyticsAgg._sum.comments_count || 0,
      avgRating: Number(analyticsAgg._avg.average_rating || 0),
    };
  }

  async getEngagement() {
    const [reactionsData, bookmarksCount, readingData] = await Promise.all([
      this.prisma.blogReaction.groupBy({
        by: ['reaction_type'],
        _count: true,
      }),
      this.prisma.blogBookmark.count(),
      this.prisma.blogReadingSession.aggregate({
        _avg: { reading_time_seconds: true },
        _count: true,
      }),
    ]);

    const completedCount = await this.prisma.blogReadingSession.count({
      where: { completed_reading: true },
    });
    const totalSessions = readingData._count || 1;

    const likes =
      reactionsData.find((r) => r.reaction_type === 'like')?._count || 0;
    const dislikes =
      reactionsData.find((r) => r.reaction_type === 'dislike')?._count || 0;

    return {
      likes_count: likes,
      dislikes_count: dislikes,
      bookmarks_count: bookmarksCount,
      avg_reading_time_minutes: Math.round(
        (readingData._avg.reading_time_seconds || 0) / 60,
      ),
      completion_rate_percentage: Math.round(
        (completedCount / totalSessions) * 100,
      ),
    };
  }

  async getTopPosts(limit = 10) {
    return this.prisma.blogPost.findMany({
      where: { is_active: true, published_at: { not: null } },
      orderBy: { analytics: { views_count: 'desc' } },
      take: limit,
      include: {
        analytics: true,
        post_tags: { include: { tag: true } },
        _count: { select: { reactions: true, bookmarks: true } },
      },
    });
  }

  async getTagAnalytics() {
    const tags = await this.prisma.blogTag.findMany({
      include: {
        _count: { select: { post_tags: true } },
        tag_analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
      orderBy: { name: 'asc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      post_count: tag._count.post_tags,
      total_views: tag.tag_analytics.reduce((sum, a) => sum + a.views, 0),
      total_clicks: tag.tag_analytics.reduce((sum, a) => sum + a.clicks, 0),
    }));
  }
}
