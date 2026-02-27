'use client';

/**
 * Página CMS pública dinámica - /p/[slug]
 * Renderiza páginas creadas desde el CMS (legal, static, blog_list, etc.)
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cmsService } from '@/modules/admin/services/cms.service';
import { SectionRenderer } from '@/shared/components/landing/sections/SectionRenderer';
import { Header } from '@/shared/components/landing/Header';
import type { Page } from '@/modules/admin/types/cms.types';

export default function CMSPublicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchPage = async () => {
      setLoading(true);
      try {
        const data = await cmsService.getPageBySlug(slug);
        setPage(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Header user={null} onLoginClick={() => {}} onSignOut={() => {}} />
        <div className="max-w-4xl mx-auto py-20 px-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Página no encontrada</h1>
          <p className="text-gray-500 dark:text-gray-400">La página que buscas no existe o no está publicada.</p>
        </div>
      </div>
    );
  }

  const sections = page.sections || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header user={null} onLoginClick={() => {}} onSignOut={() => {}} />

      {/* Page title for non-landing pages */}
      {page.page_type !== 'landing' && (
        <div className="max-w-4xl mx-auto pt-12 pb-6 px-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">{page.title}</h1>
          {page.description && (
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">{page.description}</p>
          )}
        </div>
      )}

      {/* Render sections */}
      {sections.length > 0 ? (
        sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            onGetStartedClick={() => {}}
            onContactSalesClick={() => {}}
          />
        ))
      ) : (
        page.page_type !== 'landing' && (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <p className="text-gray-500 dark:text-gray-400">Esta página aún no tiene contenido.</p>
          </div>
        )
      )}

      {/* Footer */}
      <footer className="relative px-4 sm:px-6 py-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Contagracia. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
