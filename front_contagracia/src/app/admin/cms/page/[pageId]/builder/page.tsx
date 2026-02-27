'use client';

/**
 * Page Builder - Ruta /admin/cms/page/[pageId]/builder
 * Carga la página y sus secciones, inicializa el BuilderProvider
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cmsService } from '@/modules/admin/services/cms.service';
import { BuilderProvider, type BuilderSection } from '@/modules/admin/components/cms/page-builder/BuilderContext';
import { PageBuilder } from '@/modules/admin/components/cms/page-builder/PageBuilder';
import type { Page, ContainerContent } from '@/modules/admin/types/cms.types';

export default function PageBuilderPage() {
  const params = useParams();
  const pageId = params.pageId as string;

  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const pageData = await cmsService.getPage(pageId);
        setPage(pageData);

        // Cargar secciones y extraer componentes del contenido JSONB
        const sectionsData = await cmsService.getSections(pageId);
        const builderSections: BuilderSection[] = sectionsData.map((s) => {
          const content = (s.content || {}) as ContainerContent;
          return {
            ...s,
            components: content.components || [],
          };
        });
        setSections(builderSections);
      } catch {
        setError('Error al cargar la página.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pageId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {error || 'Página no encontrada'}
          </h2>
          <button
            onClick={() => window.history.back()}
            className="text-sm text-indigo-600 hover:underline"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <BuilderProvider pageId={pageId} initialSections={sections}>
      <PageBuilder pageId={pageId} pageTitle={page.title} />
    </BuilderProvider>
  );
}
