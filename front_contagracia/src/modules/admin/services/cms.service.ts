/**
 * CMS Service - API calls for CMS endpoints in admin-service
 * Consume endpoints de admin-service para pages, sections y uploads
 */

import { adminClient } from '@/shared/services/api/apiClient';
import type {
  Page,
  CreatePageDto,
  UpdatePageDto,
  SiteSection,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  Navigation,
  UploadResponse,
} from '@/modules/admin/types/cms.types';

const ADMIN_CMS = '/admin/cms';
const PUBLIC_CMS = '/cms';

export const cmsService = {
  // ===== PAGES (Admin) =====

  getPages: async (includeInactive = false): Promise<Page[]> => {
    const response = await adminClient.get(`${ADMIN_CMS}/pages`, {
      params: { includeInactive },
    });
    return response.data;
  },

  getPage: async (id: string): Promise<Page> => {
    const response = await adminClient.get(`${ADMIN_CMS}/pages/${id}`);
    return response.data;
  },

  createPage: async (data: CreatePageDto): Promise<Page> => {
    const response = await adminClient.post(`${ADMIN_CMS}/pages`, data);
    return response.data;
  },

  updatePage: async (id: string, data: UpdatePageDto): Promise<Page> => {
    const response = await adminClient.patch(`${ADMIN_CMS}/pages/${id}`, data);
    return response.data;
  },

  deletePage: async (id: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_CMS}/pages/${id}`);
  },

  // ===== SECTIONS (Admin) =====

  getSections: async (pageId: string): Promise<SiteSection[]> => {
    const response = await adminClient.get(
      `${ADMIN_CMS}/pages/${pageId}/sections`,
    );
    return response.data;
  },

  getSection: async (id: string): Promise<SiteSection> => {
    const response = await adminClient.get(`${ADMIN_CMS}/sections/${id}`);
    return response.data;
  },

  createSection: async (
    pageId: string,
    data: CreateSectionDto,
  ): Promise<SiteSection> => {
    const response = await adminClient.post(
      `${ADMIN_CMS}/pages/${pageId}/sections`,
      data,
    );
    return response.data;
  },

  updateSection: async (
    id: string,
    data: UpdateSectionDto,
  ): Promise<SiteSection> => {
    const response = await adminClient.patch(
      `${ADMIN_CMS}/sections/${id}`,
      data,
    );
    return response.data;
  },

  deleteSection: async (id: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_CMS}/sections/${id}`);
  },

  reorderSections: async (data: ReorderSectionsDto): Promise<void> => {
    await adminClient.patch(`${ADMIN_CMS}/sections/reorder`, data);
  },

  toggleSection: async (id: string): Promise<SiteSection> => {
    const response = await adminClient.patch(
      `${ADMIN_CMS}/sections/${id}/toggle`,
    );
    return response.data;
  },

  // ===== UPLOADS =====

  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await adminClient.post(
      `${ADMIN_CMS}/uploads`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  deleteImage: async (url: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_CMS}/uploads`, { data: { url } });
  },

  // ===== PUBLIC =====

  getPageBySlug: async (slug: string): Promise<Page> => {
    const response = await adminClient.get(`${PUBLIC_CMS}/pages/${slug}`);
    return response.data;
  },

  getNavigation: async (): Promise<Navigation> => {
    const response = await adminClient.get(`${PUBLIC_CMS}/navigation`);
    return response.data;
  },
};
