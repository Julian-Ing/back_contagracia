'use client';

import { useState, useEffect, useCallback } from 'react';
import { cmsService } from '@/modules/admin/services/cms.service';
import type { Page } from '@/modules/admin/types/cms.types';

export function usePage(id: string | null) {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    if (!id) {
      setPage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await cmsService.getPage(id);
      setPage(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar página');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return { page, loading, error, refetch: fetchPage };
}
