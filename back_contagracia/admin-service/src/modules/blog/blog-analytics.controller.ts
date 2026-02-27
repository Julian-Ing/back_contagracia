import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { BlogAnalyticsService } from './blog-analytics.service';

@ApiTags('blog')
@ApiBearerAuth('JWT-auth')
@Controller('admin/blog/analytics')
export class BlogAnalyticsController {
  constructor(private readonly analyticsService: BlogAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Stats generales del blog' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Métricas de engagement' })
  getEngagement() {
    return this.analyticsService.getEngagement();
  }

  @Get('top-posts')
  @ApiOperation({ summary: 'Posts con más engagement' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopPosts(@Query('limit') limit?: number) {
    return this.analyticsService.getTopPosts(limit ? +limit : undefined);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Analytics por tag' })
  getTagAnalytics() {
    return this.analyticsService.getTagAnalytics();
  }
}
