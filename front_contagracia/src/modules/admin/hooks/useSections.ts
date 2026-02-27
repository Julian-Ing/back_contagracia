'use client';

import { useState, useEffect, useCallback } from 'react';
import { cmsService } from '@/modules/admin/services/cms.service';
import type { SiteSection } from '@/modules/admin/types/cms.types';

export function useSections(pageId: string | null) {
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    if (!pageId) {
      setSections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await cmsService.getSections(pageId);
      setSections(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar secciones');
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return { sections, setSections, loading, error, refetch: fetchSections };
}
