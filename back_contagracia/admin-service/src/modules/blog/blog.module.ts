import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BlogPostsController } from './blog-posts.controller';
import { BlogPostsService } from './blog-posts.service';
import { BlogTagsController } from './blog-tags.controller';
import { BlogTagsService } from './blog-tags.service';
import { BlogCommentsController } from './blog-comments.controller';
import { BlogCommentsService } from './blog-comments.service';
import { BlogAnalyticsController } from './blog-analytics.controller';
import { BlogAnalyticsService } from './blog-analytics.service';
import { BlogPublicController } from './blog-public.controller';
import { BlogPublicService } from './blog-public.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    BlogPostsController,
    BlogTagsController,
    BlogCommentsController,
    BlogAnalyticsController,
    BlogPublicController,
  ],
  providers: [
    BlogPostsService,
    BlogTagsService,
    BlogCommentsService,
    BlogAnalyticsService,
    BlogPublicService,
  ],
  exports: [BlogPostsService, BlogTagsService],
})
export class BlogModule {}
