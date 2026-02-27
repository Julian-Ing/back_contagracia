'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Globe,
  Image as ImageIcon,
  Code,
  Save,
  Upload,
  Trash2,
  Loader2,
  AlertTriangle,
  Info,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { adminService } from '@/modules/admin/services/admin.service';
import { getUploadUrl } from '@/config/api.config';

// ─── Types ───

interface SiteSetting {
  key: string;
  value: string | null;
  description: string | null;
}

// ─── Component ───

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Local form state
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [trackingScripts, setTrackingScripts] = useState('');

  // Upload refs
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);

  // ─── Load settings ───

  const loadSettings = useCallback(async () => {
    try {
      const data: SiteSetting[] = await adminService.getSiteSettings();
      const map: Record<string, string | null> = {};
      for (const s of data) {
        map[s.key] = s.value;
      }
      setSettings(map);
      setSeoTitle(map.site_title || '');
      setSeoDescription(map.site_description || '');
      setSeoKeywords(map.site_keywords || '');
      setTrackingScripts(map.tracking_scripts || '');
    } catch {
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ─── Save helpers ───

  const saveSetting = async (key: string, value: string | null) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await adminService.updateSiteSetting(key, value || null);
      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success('Guardado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const saveSeoSettings = async () => {
    setSaving((prev) => ({ ...prev, seo: true }));
    try {
      await Promise.all([
        adminService.updateSiteSetting('site_title', seoTitle || null),
        adminService.updateSiteSetting('site_description', seoDescription || null),
        adminService.updateSiteSetting('site_keywords', seoKeywords || null),
      ]);
      setSettings((prev) => ({
        ...prev,
        site_title: seoTitle || null,
        site_description: seoDescription || null,
        site_keywords: seoKeywords || null,
      }));
      toast.success('Metadatos SEO guardados');
    } catch {
      toast.error('Error al guardar metadatos');
    } finally {
      setSaving((prev) => ({ ...prev, seo: false }));
    }
  };

  const saveTrackingScripts = async () => {
    await saveSetting('tracking_scripts', trackingScripts);
  };

  // ─── Upload handlers ───

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving((prev) => ({ ...prev, favicon: true }));
    try {
      const { url } = await adminService.uploadFavicon(file);
      setSettings((prev) => ({ ...prev, favicon_url: url }));
      toast.success('Favicon actualizado');
    } catch {
      toast.error('Error al subir favicon');
    } finally {
      setSaving((prev) => ({ ...prev, favicon: false }));
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    }
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving((prev) => ({ ...prev, ogImage: true }));
    try {
      const { url } = await adminService.uploadOgImage(file);
      setSettings((prev) => ({ ...prev, og_image_url: url }));
      toast.success('Imagen OG actualizada');
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setSaving((prev) => ({ ...prev, ogImage: false }));
      if (ogImageInputRef.current) ogImageInputRef.current.value = '';
    }
  };

  const removeFavicon = async () => {
    await saveSetting('favicon_url', null);
  };

  const removeOgImage = async () => {
    await saveSetting('og_image_url', null);
  };

  // ─── Computed values ───

  const scriptTagCount = (trackingScripts.match(/<script[\s>]/gi) || []).length;
  const hasScripts = trackingScripts.trim().length > 0;

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configuración del Sitio
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gestiona los metadatos SEO, favicon, imagen para redes sociales y scripts de seguimiento.
        </p>
      </div>

      {/* ═══════════════ SECTION 1: SEO ═══════════════ */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SEO y Metadatos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Controla cómo aparece tu sitio en Google y redes sociales
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="seo-title">Título del sitio</Label>
              <span className={`text-xs ${seoTitle.length > 60 ? 'text-amber-500' : 'text-gray-400'}`}>
                {seoTitle.length}/60
              </span>
            </div>
            <Input
              id="seo-title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Ej: Contagracia - Software Contable para MiPymes"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="seo-description">Meta descripción</Label>
              <span className={`text-xs ${seoDescription.length > 160 ? 'text-amber-500' : 'text-gray-400'}`}>
                {seoDescription.length}/160
              </span>
            </div>
            <textarea
              id="seo-description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 dark:text-white"
              placeholder="Descripción que aparecerá en los resultados de Google..."
            />
          </div>

          {/* Keywords */}
          <div>
            <Label htmlFor="seo-keywords" className="mb-1.5 block">Palabras clave</Label>
            <Input
              id="seo-keywords"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="contabilidad, erp, pymes, colombia, software contable"
            />
            <p className="text-xs text-gray-400 mt-1">Separadas por comas</p>
          </div>

          {/* Google Preview */}
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 bg-gray-50 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Vista previa en Google
            </p>
            <div className="space-y-0.5">
              <p className="text-blue-700 dark:text-blue-400 text-lg leading-tight truncate">
                {seoTitle || 'Título del sitio'}
              </p>
              <p className="text-green-700 dark:text-green-500 text-sm">
                contagracia.com
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {seoDescription || 'Descripción del sitio...'}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSeoSettings} disabled={saving.seo}>
              {saving.seo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar metadatos
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════ SECTION 2: VISUAL IDENTITY ═══════════════ */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Identidad Visual</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Favicon e imagen para compartir en redes sociales
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Favicon */}
          <div className="space-y-3">
            <Label>Favicon</Label>
            <p className="text-xs text-gray-400">
              Icono que aparece en la pestaña del navegador. Formatos: .ico, .png, .svg (máx 2MB)
            </p>

            {settings.favicon_url ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
                <img
                  src={getUploadUrl(settings.favicon_url)}
                  alt="Favicon actual"
                  className="h-10 w-10 object-contain rounded border border-gray-200 dark:border-gray-600 bg-white"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    Favicon actual
                  </p>
                  <p className="text-xs text-gray-400 truncate">{settings.favicon_url}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFavicon}
                  disabled={saving.favicon_url}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div>
              <input
                ref={faviconInputRef}
                type="file"
                accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                onChange={handleFaviconUpload}
                className="hidden"
                id="favicon-upload"
              />
              <Button
                variant="outline"
                onClick={() => faviconInputRef.current?.click()}
                disabled={saving.favicon}
                className="w-full"
              >
                {saving.favicon ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {settings.favicon_url ? 'Cambiar favicon' : 'Subir favicon'}
              </Button>
            </div>
          </div>

          {/* OG Image */}
          <div className="space-y-3">
            <Label>Imagen Open Graph</Label>
            <p className="text-xs text-gray-400">
              Imagen que aparece al compartir en redes sociales. Recomendado: 1200x630px (máx 2MB)
            </p>

            {settings.og_image_url ? (
              <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-slate-800/50">
                <img
                  src={getUploadUrl(settings.og_image_url)}
                  alt="OG Image actual"
                  className="w-full h-32 object-cover"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeOgImage}
                  disabled={saving.og_image_url}
                  className="absolute top-2 right-2 h-7 w-7 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}

            <div>
              <input
                ref={ogImageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleOgImageUpload}
                className="hidden"
                id="og-upload"
              />
              <Button
                variant="outline"
                onClick={() => ogImageInputRef.current?.click()}
                disabled={saving.ogImage}
                className="w-full"
              >
                {saving.ogImage ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {settings.og_image_url ? 'Cambiar imagen' : 'Subir imagen OG'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ SECTION 3: TRACKING SCRIPTS ═══════════════ */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Code className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scripts de Seguimiento</h2>
              <Badge variant={hasScripts ? 'success' : 'secondary'}>
                {hasScripts ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Google Analytics, Meta Pixel, Google Tag Manager, etc.
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 mb-4">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Los scripts se inyectarán en todas las páginas del sitio.</p>
              <p>Pega aquí el código completo incluyendo las etiquetas <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">&lt;script&gt;</code>.</p>
            </div>
          </div>
        </div>

        {/* Warning card */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 mb-4">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Solo pega código de fuentes confiables. Scripts maliciosos pueden comprometer la seguridad del sitio.
            </p>
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tracking-scripts">Código de scripts</Label>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{trackingScripts.length} caracteres</span>
              {scriptTagCount > 0 && (
                <span>{scriptTagCount} {scriptTagCount === 1 ? 'script' : 'scripts'} detectado{scriptTagCount > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
          <textarea
            id="tracking-scripts"
            value={trackingScripts}
            onChange={(e) => setTrackingScripts(e.target.value)}
            rows={12}
            className="flex w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 dark:text-gray-200 resize-y"
            style={{ minHeight: '200px' }}
            placeholder={'<!-- Google Analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag(\'js\', new Date());\n  gtag(\'config\', \'G-XXXXXXXXXX\');\n</script>'}
          />
        </div>

        {/* Quick reference */}
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Referencia rápida</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { name: 'Google Analytics 4', id: 'G-XXXXXXXXXX', url: 'https://analytics.google.com' },
              { name: 'Meta Pixel (Facebook)', id: '15-16 dígitos', url: 'https://business.facebook.com/events_manager' },
              { name: 'Google Tag Manager', id: 'GTM-XXXXXXX', url: 'https://tagmanager.google.com' },
              { name: 'Google Ads', id: 'AW-XXXXXXXXX', url: 'https://ads.google.com' },
            ].map((item) => (
              <a
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-gray-400">({item.id})</span>
              </a>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={saveTrackingScripts} disabled={saving.tracking_scripts}>
            {saving.tracking_scripts ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar scripts
          </Button>
        </div>
      </div>
    </div>
  );
}
