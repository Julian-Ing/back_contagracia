/**
 * Blog Service - API calls for blog endpoints in admin-service
 */

import { adminClient } from '@/shared/services/api/apiClient';
import { getUploadUrl } from '@/config/api.config';
import type {
  BlogPost,
  BlogTag,
  BlogComment,
  BlogOverviewStats,
  EngagementStats,
  TagAnalyticsItem,
  CreatePostDto,
  UpdatePostDto,
  CreateTagDto,
  UpdateTagDto,
  CreateCommentDto,
  BlogPostQueryParams,
  PaginatedBlogResponse,
} from '@/modules/admin/types/blog.types';

const ADMIN_BLOG = '/admin/blog';
const PUBLIC_BLOG = '/blog';

export const blogService = {
  // ===== ADMIN - POSTS =====

  getPosts: async (
    params: BlogPostQueryParams = {},
  ): Promise<PaginatedBlogResponse<BlogPost>> => {
    const response = await adminClient.get(`${ADMIN_BLOG}/posts`, { params });
    return response.data;
  },

  getPost: async (id: string): Promise<BlogPost> => {
    const response = await adminClient.get(`${ADMIN_BLOG}/posts/${id}`);
    return response.data;
  },

  createPost: async (data: CreatePostDto): Promise<BlogPost> => {
    const response = await adminClient.post(`${ADMIN_BLOG}/posts`, data);
    return response.data;
  },

  updatePost: async (id: string, data: UpdatePostDto): Promise<BlogPost> => {
    const response = await adminClient.patch(
      `${ADMIN_BLOG}/posts/${id}`,
      data,
    );
    return response.data;
  },

  deletePost: async (id: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BLOG}/posts/${id}`);
  },

  // ===== ADMIN - TAGS =====

  getTags: async (): Promise<BlogTag[]> => {
    const response = await adminClient.get(`${ADMIN_BLOG}/tags`);
    return response.data;
  },

  createTag: async (data: CreateTagDto): Promise<BlogTag> => {
    const response = await adminClient.post(`${ADMIN_BLOG}/tags`, data);
    return response.data;
  },

  updateTag: async (id: string, data: UpdateTagDto): Promise<BlogTag> => {
    const response = await adminClient.patch(`${ADMIN_BLOG}/tags/${id}`, data);
    return response.data;
  },

  deleteTag: async (id: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BLOG}/tags/${id}`);
  },

  // ===== ADMIN - COMMENTS =====

  getComments: async (postId: string): Promise<BlogComment[]> => {
    const response = await adminClient.get(
      `${ADMIN_BLOG}/posts/${postId}/comments`,
    );
    return response.data;
  },

  approveComment: async (id: string): Promise<void> => {
    await adminClient.patch(`${ADMIN_BLOG}/comments/${id}/approve`);
  },

  deleteComment: async (id: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BLOG}/comments/${id}`);
  },

  // ===== ADMIN - ANALYTICS =====

  getAnalyticsOverview: async (): Promise<BlogOverviewStats> => {
    const response = await adminClient.get(`${ADMIN_BLOG}/analytics/overview`);
    return response.data;
  },

  getEngagementAnalytics: async (): Promise<EngagementStats> => {
    const response = await adminClient.get(
      `${ADMIN_BLOG}/analytics/engagement`,
    );
    return response.data;
  },

  getTopPosts: async (limit = 10): Promise<BlogPost[]> => {
    const response = await adminClient.get(`${ADMIN_BLOG}/analytics/top-posts`, {
      params: { limit },
    });
    return response.data;
  },

  getTagAnalytics: async (): Promise<TagAnalyticsItem[]> => {
    const response = await adminClient.get(`${ADMIN_BLOG}/analytics/tags`);
    return response.data;
  },

  // ===== ADMIN - UPLOADS =====

  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await adminClient.post(`${ADMIN_BLOG}/uploads`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Convert relative path to absolute URL so images load from backend
    return { url: getUploadUrl(response.data.url) };
  },

  deleteImage: async (url: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BLOG}/uploads`, { data: { url } });
  },

  // ===== PUBLIC ENDPOINTS =====

  getPublicPosts: async (
    params: BlogPostQueryParams & { tag_ids?: string } = {},
  ): Promise<PaginatedBlogResponse<BlogPost>> => {
    const response = await adminClient.get(`${PUBLIC_BLOG}/posts`, { params });
    return response.data;
  },

  getPublicPost: async (slug: string): Promise<BlogPost> => {
    const response = await adminClient.get(`${PUBLIC_BLOG}/posts/${slug}`);
    return response.data;
  },

  registerView: async (slug: string, visitorId: string): Promise<void> => {
    await adminClient.post(`${PUBLIC_BLOG}/posts/${slug}/view`, {
      visitor_id: visitorId,
    });
  },

  getPublicComments: async (slug: string): Promise<BlogComment[]> => {
    const response = await adminClient.get(
      `${PUBLIC_BLOG}/posts/${slug}/comments`,
    );
    return response.data;
  },

  createComment: async (
    slug: string,
    data: CreateCommentDto,
  ): Promise<BlogComment> => {
    const response = await adminClient.post(
      `${PUBLIC_BLOG}/posts/${slug}/comments`,
      data,
    );
    return response.data;
  },

  getEngagement: async (slug: string): Promise<EngagementStats> => {
    const response = await adminClient.get(
      `${PUBLIC_BLOG}/posts/${slug}/engagement`,
    );
    return response.data;
  },

  toggleReaction: async (
    slug: string,
    reactionType: string,
    visitorId: string,
  ): Promise<{ action: string; reaction_type: string }> => {
    const response = await adminClient.post(
      `${PUBLIC_BLOG}/posts/${slug}/reaction`,
      { reaction_type: reactionType, visitor_id: visitorId },
    );
    return response.data;
  },

  toggleBookmark: async (
    slug: string,
    visitorId: string,
  ): Promise<{ bookmarked: boolean }> => {
    const response = await adminClient.post(
      `${PUBLIC_BLOG}/posts/${slug}/bookmark`,
      { visitor_id: visitorId },
    );
    return response.data;
  },

  getBookmarkedPosts: async (visitorId: string): Promise<BlogPost[]> => {
    const response = await adminClient.get(`${PUBLIC_BLOG}/bookmarks`, {
      params: { visitor_id: visitorId },
    });
    return response.data;
  },

  updateReadingSession: async (
    slug: string,
    data: {
      visitor_id: string;
      reading_time_seconds: number;
      scroll_percentage: number;
      completed_reading?: boolean;
    },
  ): Promise<void> => {
    await adminClient.post(
      `${PUBLIC_BLOG}/posts/${slug}/reading-session`,
      data,
    );
  },

  getPublicTags: async (): Promise<BlogTag[]> => {
    const response = await adminClient.get(`${PUBLIC_BLOG}/tags`);
    return response.data;
  },

  trackTagClick: async (tagId: string): Promise<void> => {
    await adminClient.post(`${PUBLIC_BLOG}/tags/${tagId}/click`);
  },
};

export default blogService;
