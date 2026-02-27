'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Edit,
  Eye,
  EyeOff,
  Plus,
  FileText,
  Home,
  Newspaper,
  File,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Select } from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { cmsService } from '@/modules/admin/services/cms.service';
import type { Page } from '@/modules/admin/types/cms.types';

const PAGE_TYPE_OPTIONS = [
  { value: 'landing', label: 'Landing Page' },
  { value: 'static', label: 'Página Estática' },
  { value: 'blog_list', label: 'Lista de Blog' },
  { value: 'legal', label: 'Página Legal' },
];

export default function CMSManagerPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config modal state
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [configFormData, setConfigFormData] = useState<Partial<Page>>({});

  // New page modal state
  const [creatingNewPage, setCreatingNewPage] = useState(false);
  const [newPageData, setNewPageData] = useState<Partial<Page>>({
    title: '',
    slug: '',
    description: '',
    page_type: 'static',
    is_active: true,
    is_published: false,
  });

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cmsService.getPages(true);
      setPages(data.filter((p) => p.page_type !== 'landing'));
    } catch {
      setError('Error al cargar las páginas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const getPageIcon = (pageType: string) => {
    switch (pageType) {
      case 'landing':
        return <Home className="w-5 h-5 text-indigo-400" />;
      case 'blog_list':
        return <Newspaper className="w-5 h-5 text-pink-400" />;
      case 'legal':
        return <File className="w-5 h-5 text-yellow-400" />;
      default:
        return <FileText className="w-5 h-5 text-blue-400" />;
    }
  };

  // Config modal handlers
  const handleOpenConfig = (page: Page) => {
    setEditingPage(page);
    setConfigFormData({
      title: page.title,
      slug: page.slug,
      description: page.description,
      page_type: page.page_type,
      is_active: page.is_active,
      is_published: page.is_published,
      show_in_header: page.show_in_header || false,
      show_in_footer: page.show_in_footer || false,
      header_label: page.header_label || '',
      footer_label: page.footer_label || '',
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      og_title: page.og_title || '',
      og_description: page.og_description || '',
      og_image: page.og_image || '',
    });
  };

  const handleCloseConfig = () => {
    setEditingPage(null);
    setConfigFormData({});
  };

  const handleSaveConfig = async () => {
    if (!editingPage) return;
    setSaving(true);
    setError(null);
    try {
      await cmsService.updatePage(editingPage.id, {
        title: configFormData.title,
        slug: configFormData.slug,
        description: configFormData.description || undefined,
        page_type: configFormData.page_type,
        is_active: configFormData.is_active,
        is_published: configFormData.is_published,
        show_in_header: configFormData.show_in_header,
        show_in_footer: configFormData.show_in_footer,
        header_label: configFormData.header_label || undefined,
        footer_label: configFormData.footer_label || undefined,
        meta_title: configFormData.meta_title || undefined,
        meta_description: configFormData.meta_description || undefined,
        og_title: configFormData.og_title || undefined,
        og_description: configFormData.og_description || undefined,
        og_image: configFormData.og_image || undefined,
      });
      await fetchPages();
      handleCloseConfig();
    } catch {
      setError('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  // New page modal handlers
  const handleOpenNewPage = () => {
    setCreatingNewPage(true);
    setNewPageData({
      title: '',
      slug: '',
      description: '',
      page_type: 'static',
      is_active: true,
      is_published: false,
    });
  };

  const handleCloseNewPage = () => {
    setCreatingNewPage(false);
    setNewPageData({});
  };

  const handleCreatePage = async () => {
    if (!newPageData.title || !newPageData.slug) return;
    setSaving(true);
    setError(null);
    try {
      const created = await cmsService.createPage({
        title: newPageData.title!,
        slug: newPageData.slug!,
        description: newPageData.description || undefined,
        page_type: (newPageData.page_type as Page['page_type']) || 'static',
      });
      // Actualizar is_active/is_published si difieren del default
      if (newPageData.is_active === false || newPageData.is_published === true) {
        await cmsService.updatePage(created.id, {
          is_active: newPageData.is_active ?? true,
          is_published: newPageData.is_published ?? false,
        });
      }
      await fetchPages();
      handleCloseNewPage();
    } catch {
      setError('Error al crear la página.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gestión de Contenido del Sitio</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Administra las páginas y secciones de tu sitio web. Edita contenido, activa/desactiva
              secciones y agrega nuevo contenido.
            </p>
          </div>
          <Button onClick={handleOpenNewPage}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Página
          </Button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Pages List */}
      <div className="space-y-3">
        {pages.map((page) => (
          <div
            key={page.id}
            className={`rounded-lg border border-gray-200 dark:border-slate-700 p-4 transition-opacity ${
              !page.is_active ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getPageIcon(page.page_type)}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{page.title}</h3>
                    <Badge variant="outline" className="font-mono text-xs border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400">
                      /{page.slug}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400">
                      {page.page_type}
                    </Badge>
                    {page.is_active ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <Eye className="w-3 h-3 mr-1" />
                        Publicado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 border-gray-600">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Borrador
                      </Badge>
                    )}
                    {(page.sections?.length || 0) > 0 && (
                      <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400">
                        {page.sections!.length} {page.sections!.length === 1 ? 'sección' : 'secciones'}
                      </Badge>
                    )}
                  </div>
                  {page.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{page.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenConfig(page)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Config
                </Button>
                <Button size="sm" onClick={() => router.push(`/admin/cms/page/${page.id}/builder`)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar Página
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Config Modal */}
      <Dialog open={!!editingPage} onOpenChange={(open) => !open && handleCloseConfig()}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Configurar Página: {editingPage?.title}
            </DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Administra la configuración, navegación y SEO de la página
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-slate-700 pb-2">
                Información Básica
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-800 dark:text-gray-200">Título *</Label>
                  <Input
                    value={configFormData.title || ''}
                    onChange={(e) =>
                      setConfigFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Título de la página"
                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-800 dark:text-gray-200">Slug (URL) *</Label>
                  <Input
                    value={configFormData.slug || ''}
                    onChange={(e) =>
                      setConfigFormData((prev) => ({ ...prev, slug: e.target.value.replace(/^p\//, '') }))
                    }
                    placeholder="nombre-url"
                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    URL: /p/{configFormData.slug || 'nombre-url'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Descripción</Label>
                <Textarea
                  value={configFormData.description || ''}
                  onChange={(e) =>
                    setConfigFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Descripción de la página"
                  rows={3}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-800 dark:text-gray-200">Tipo de Página</Label>
                  <Select
                    options={PAGE_TYPE_OPTIONS}
                    value={configFormData.page_type || 'static'}
                    onChange={(value) =>
                      setConfigFormData((prev) => ({
                        ...prev,
                        page_type: value as Page['page_type'],
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-2 pt-7">
                  <Switch
                    checked={configFormData.is_active}
                    onCheckedChange={(checked) =>
                      setConfigFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label className="text-gray-800 dark:text-gray-200 cursor-pointer">Página Activa</Label>
                </div>

                <div className="flex items-center gap-2 pt-7">
                  <Switch
                    checked={configFormData.is_published}
                    onCheckedChange={(checked) =>
                      setConfigFormData((prev) => ({ ...prev, is_published: checked }))
                    }
                  />
                  <Label className="text-gray-800 dark:text-gray-200 cursor-pointer">Publicada</Label>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-slate-700 pb-2">
                Navegación
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={configFormData.show_in_header}
                      onCheckedChange={(checked) =>
                        setConfigFormData((prev) => ({ ...prev, show_in_header: checked }))
                      }
                    />
                    <Label className="text-gray-800 dark:text-gray-200 font-semibold cursor-pointer">
                      Mostrar en Header
                    </Label>
                  </div>
                  {configFormData.show_in_header && (
                    <Input
                      placeholder="Etiqueta del link (ej: Inicio)"
                      value={configFormData.header_label || ''}
                      onChange={(e) =>
                        setConfigFormData((prev) => ({ ...prev, header_label: e.target.value }))
                      }
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={configFormData.show_in_footer}
                      onCheckedChange={(checked) =>
                        setConfigFormData((prev) => ({ ...prev, show_in_footer: checked }))
                      }
                    />
                    <Label className="text-gray-800 dark:text-gray-200 font-semibold cursor-pointer">
                      Mostrar en Footer
                    </Label>
                  </div>
                  {configFormData.show_in_footer && (
                    <Input
                      placeholder="Etiqueta del link (ej: Soporte)"
                      value={configFormData.footer_label || ''}
                      onChange={(e) =>
                        setConfigFormData((prev) => ({ ...prev, footer_label: e.target.value }))
                      }
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-slate-700 pb-2">
                SEO y Meta Tags
              </h3>

              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Meta Title</Label>
                <Input
                  value={configFormData.meta_title || ''}
                  onChange={(e) =>
                    setConfigFormData((prev) => ({ ...prev, meta_title: e.target.value }))
                  }
                  placeholder="Título para motores de búsqueda"
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Meta Description</Label>
                <Textarea
                  value={configFormData.meta_description || ''}
                  onChange={(e) =>
                    setConfigFormData((prev) => ({ ...prev, meta_description: e.target.value }))
                  }
                  placeholder="Descripción para motores de búsqueda"
                  rows={2}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Open Graph Title</Label>
                <Input
                  value={configFormData.og_title || ''}
                  onChange={(e) =>
                    setConfigFormData((prev) => ({ ...prev, og_title: e.target.value }))
                  }
                  placeholder="Título para redes sociales (opcional)"
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Open Graph Description</Label>
                <Textarea
                  value={configFormData.og_description || ''}
                  onChange={(e) =>
                    setConfigFormData((prev) => ({ ...prev, og_description: e.target.value }))
                  }
                  placeholder="Descripción para redes sociales (opcional)"
                  rows={2}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Open Graph Image (URL)</Label>
                <Input
                  value={configFormData.og_image || ''}
                  onChange={(e) =>
                    setConfigFormData((prev) => ({ ...prev, og_image: e.target.value }))
                  }
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseConfig} disabled={saving}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Page Modal */}
      <Dialog open={creatingNewPage} onOpenChange={(open) => !open && handleCloseNewPage()}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Crear Nueva Página</DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completa la información básica de la nueva página. Podrás configurar más opciones
              después.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Título *</Label>
                <Input
                  value={newPageData.title || ''}
                  onChange={(e) =>
                    setNewPageData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Título de la página"
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-800 dark:text-gray-200">Slug (URL) *</Label>
                <Input
                  value={newPageData.slug || ''}
                  onChange={(e) =>
                    setNewPageData((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/^p\//, ''),
                    }))
                  }
                  placeholder="nombre-url"
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 font-mono"
                />
                <p className="text-xs text-gray-500">
                  URL: /p/{newPageData.slug || 'nombre-url'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Descripción (Opcional)</Label>
              <Textarea
                value={newPageData.description || ''}
                onChange={(e) =>
                  setNewPageData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Breve descripción de la página"
                rows={3}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Tipo de Página</Label>
              <Select
                options={PAGE_TYPE_OPTIONS}
                value={newPageData.page_type || 'static'}
                onChange={(value) =>
                  setNewPageData((prev) => ({
                    ...prev,
                    page_type: value as Page['page_type'],
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newPageData.is_active}
                  onCheckedChange={(checked) =>
                    setNewPageData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label className="text-gray-800 dark:text-gray-200 cursor-pointer">Página Activa</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newPageData.is_published}
                  onCheckedChange={(checked) =>
                    setNewPageData((prev) => ({ ...prev, is_published: checked }))
                  }
                />
                <Label className="text-gray-800 dark:text-gray-200 cursor-pointer">Publicar inmediatamente</Label>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong className="text-gray-700 dark:text-gray-300">Tip:</strong> Después de crear la página, podrás
                agregar secciones y configurar opciones de navegación y SEO desde el botón
                &quot;Config&quot;.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseNewPage} disabled={saving}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePage}
              disabled={saving || !newPageData.title || !newPageData.slug}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Crear Página
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
