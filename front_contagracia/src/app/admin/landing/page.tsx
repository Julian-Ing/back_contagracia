'use client';

/**
 * Editor de Landing - /admin/landing
 * Conectado al backend CMS real (admin-service)
 * Lista secciones de la página "home", permite toggle visibilidad y editar contenido
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, ArrowLeft, Edit, Eye, EyeOff, Activity, ExternalLink,
  GripVertical, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { cmsService } from '@/modules/admin/services/cms.service';
import { SectionContentEditor } from '@/modules/admin/components/cms/SectionContentEditor';
import type { Page, SiteSection } from '@/modules/admin/types/cms.types';

export default function LandingEditorPage() {
  const [loading, setLoading] = useState(true);
  const [landingPage, setLandingPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchLanding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await cmsService.getPageBySlug('home');
      setLandingPage(page);
      setSections(page.sections || []);
    } catch {
      setError('No se pudo cargar la landing. Asegúrate de que exista una página con slug "home".');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLanding(); }, [fetchLanding]);

  const toggleSection = async (sectionId: string) => {
    setTogglingId(sectionId);
    try {
      const updated = await cmsService.toggleSection(sectionId);
      setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, is_active: updated.is_active } : s)));
    } catch {
      setError('Error al cambiar visibilidad.');
    } finally {
      setTogglingId(null);
    }
  };

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    const reorderData = newSections.map((s, i) => ({ id: s.id, display_order: i }));
    setSections(newSections);

    try {
      await cmsService.reorderSections({ sections: reorderData });
    } catch {
      // Revertir en caso de error
      setSections(sections);
      setError('Error al reordenar secciones.');
    }
  };

  // Si estamos editando una sección, mostrar el editor
  if (editingSectionId) {
    return (
      <SectionContentEditor
        sectionId={editingSectionId}
        onBack={() => { setEditingSectionId(null); fetchLanding(); }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!landingPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Editor de Landing</h1>
            <p className="text-gray-500 dark:text-gray-400">Edita el contenido de la página principal</p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No se encontró la página landing. Crea una página con slug &quot;home&quot; desde el CMS.
          </p>
          <Link href="/admin/cms" className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
            Ir al CMS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Editor de Landing</h1>
            <p className="text-gray-500 dark:text-gray-400">Edita el contenido de la página principal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open('/', '_blank')}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Landing
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Info Card */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{landingPage.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sections.length} sección{sections.length !== 1 ? 'es' : ''} configurada{sections.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Badge
            variant="outline"
            className={landingPage.is_published ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}
          >
            {landingPage.is_published ? 'Publicada' : 'Borrador'}
          </Badge>
        </div>
      </div>

      {/* Sections list */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Secciones de la Landing</h2>

        {sections.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No hay secciones configuradas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-opacity ${!section.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Reorder controls */}
                    <div className="flex flex-col gap-1 pt-1">
                      <button
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {section.title || 'Sin título'}
                        </h3>
                        <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400">
                          {section.section_type}
                        </Badge>
                      </div>
                      {section.subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{section.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(section.id)}
                      disabled={togglingId === section.id}
                      className={section.is_active ? 'text-emerald-400' : 'text-gray-500'}
                    >
                      {togglingId === section.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : section.is_active ? (
                        <><Eye className="h-4 w-4 mr-2" />Visible</>
                      ) : (
                        <><EyeOff className="h-4 w-4 mr-2" />Oculta</>
                      )}
                    </Button>

                    <Button size="sm" onClick={() => setEditingSectionId(section.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
