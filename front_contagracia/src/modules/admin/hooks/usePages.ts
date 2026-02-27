'use client';

import { useState, useEffect, useCallback } from 'react';
import { cmsService } from '@/modules/admin/services/cms.service';
import type { Page } from '@/modules/admin/types/cms.types';

export function usePages(includeInactive = false) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cmsService.getPages(includeInactive);
      setPages(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar páginas');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return { pages, loading, error, refetch: fetchPages };
}
