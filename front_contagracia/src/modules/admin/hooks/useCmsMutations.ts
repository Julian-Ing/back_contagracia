'use client';

import { useState, useCallback } from 'react';
import { cmsService } from '@/modules/admin/services/cms.service';
import type {
  CreatePageDto,
  UpdatePageDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
} from '@/modules/admin/types/cms.types';

export function useCmsMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await fn();
      return result;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error en la operación';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,

    // Pages
    createPage: (data: CreatePageDto) =>
      execute(() => cmsService.createPage(data)),
    updatePage: (id: string, data: UpdatePageDto) =>
      execute(() => cmsService.updatePage(id, data)),
    deletePage: (id: string) =>
      execute(() => cmsService.deletePage(id)),

    // Sections
    createSection: (pageId: string, data: CreateSectionDto) =>
      execute(() => cmsService.createSection(pageId, data)),
    updateSection: (id: string, data: UpdateSectionDto) =>
      execute(() => cmsService.updateSection(id, data)),
    deleteSection: (id: string) =>
      execute(() => cmsService.deleteSection(id)),
    reorderSections: (data: ReorderSectionsDto) =>
      execute(() => cmsService.reorderSections(data)),
    toggleSection: (id: string) =>
      execute(() => cmsService.toggleSection(id)),

    // Uploads
    uploadImage: (file: File) =>
      execute(() => cmsService.uploadImage(file)),
    deleteImage: (url: string) =>
      execute(() => cmsService.deleteImage(url)),
  };
}
