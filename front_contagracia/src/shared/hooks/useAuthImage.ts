'use client';

import { useState, useEffect } from 'react';
import { mediaClient } from '@/shared/services/api/apiClient';

/**
 * Hook que carga una imagen protegida de media-service usando JWT.
 * Convierte la respuesta en un blob URL para usar en <img src={...}>.
 *
 * @param mediaPath - URL relativa del media ("/api/media/{uuid}") o null
 * @returns { src, loading } - src es el blob URL o '' si no hay imagen
 */
export function useAuthImage(mediaPath: string | null | undefined): {
  src: string;
  loading: boolean;
} {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mediaPath) {
      setSrc('');
      return;
    }

    let revoked = false;
    let objectUrl = '';

    const fetchImage = async () => {
      setLoading(true);
      try {
        // mediaPath = "/api/media/{uuid}" → mediaClient base ya apunta a /api
        const endpoint = mediaPath.startsWith('/api/')
          ? mediaPath.replace('/api/', '/')
          : mediaPath;

        const res = await mediaClient.get(endpoint, { responseType: 'blob' });
        if (revoked) return;

        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      } catch {
        setSrc('');
      } finally {
        if (!revoked) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaPath]);

  return { src, loading };
}
