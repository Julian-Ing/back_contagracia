/**
 * Types for Blog Module
 */

// ===== BLOG POST =====
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  author_id?: string;
  published_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reading_time?: number;
  tags?: BlogTag[];
  analytics?: BlogAnalyticsData;
  author?: { id: string; full_name: string };
  _count?: { comments: number; views: number };
}

// ===== BLOG TAG =====
export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  is_active?: boolean;
  _count?: { post_tags: number };
}

// ===== BLOG COMMENT =====
export interface BlogComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_name: string;
  author_email: string;
  content: string;
  rating: number | null;
  is_approved: boolean;
  created_at: string;
  replies?: BlogComment[];
}

// ===== ANALYTICS =====
export interface BlogAnalyticsData {
  views_count: number;
  unique_views: number;
  comments_count: number;
  average_rating: number;
  total_ratings: number;
}

export interface BlogOverviewStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  avgRating: number;
}

export interface EngagementStats {
  likes_count: number;
  dislikes_count: number;
  bookmarks_count: number;
  avg_reading_time_minutes: number;
  completion_rate_percentage: number;
}

export interface TagAnalyticsItem {
  id: string;
  name: string;
  slug: string;
  color: string;
  post_count: number;
  total_views: number;
  total_clicks: number;
}

export interface EngagementUserState {
  user_reaction: 'like' | 'dislike' | null;
  user_bookmarked: boolean;
}

// ===== DTOs =====
export interface CreatePostDto {
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  published_at?: string | null;
  tag_ids?: string[];
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

export interface CreateTagDto {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateTagDto extends Partial<CreateTagDto> {}

export interface CreateCommentDto {
  author_name: string;
  author_email: string;
  content: string;
  parent_id?: string;
  rating?: number;
}

export interface BlogPostQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  tag_id?: string;
  status?: 'published' | 'draft' | 'all';
  sort_by?: 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';
}

export interface PaginatedBlogResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
