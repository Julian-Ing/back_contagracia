'use client';

/**
 * SectionContentEditor - Editor dinámico de contenido de secciones
 * Renderiza campos distintos según section_type (hero, feature_grid, benefits, pricing, blog_section, cta)
 * Adaptado del viejo SectionContentEditor.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  ArrowLeft, Save, Loader2, Plus, Trash2,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cmsService } from '@/modules/admin/services/cms.service';
import { ImageUploader } from './ImageUploader';
import { GradientPicker } from './GradientPicker';
import { IconPicker } from './IconPicker';
import type { SiteSection } from '@/modules/admin/types/cms.types';

interface SectionContentEditorProps {
  sectionId: string;
  onBack: () => void;
}

export function SectionContentEditor({ sectionId, onBack }: SectionContentEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<SiteSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Feature editor state
  const [openFeatures, setOpenFeatures] = useState<Record<number, boolean>>({});
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState<number | null>(null);

  const fetchSection = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cmsService.getSection(sectionId);
      setSection(data);
    } catch {
      setError('No se pudo cargar la sección.');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => { fetchSection(); }, [fetchSection]);

  const updateContent = (key: string, value: any) => {
    if (!section) return;
    setSection({
      ...section,
      content: { ...(section.content as Record<string, any> || {}), [key]: value },
    });
  };

  const handleSave = async () => {
    if (!section) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await cmsService.updateSection(sectionId, {
        title: section.title || undefined,
        subtitle: section.subtitle || undefined,
        content: section.content as any,
      });
      setSaveMsg('Cambios guardados exitosamente.');
      setTimeout(() => onBack(), 1200);
    } catch {
      setError('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sección no encontrada</h1>
        </div>
      </div>
    );
  }

  const content = (section.content as Record<string, any>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Editar Sección</h1>
            <p className="text-gray-500 dark:text-gray-400">{section.section_type}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>) : (<><Save className="h-4 w-4 mr-2" />Guardar Cambios</>)}
        </Button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {saveMsg && <p className="text-emerald-500 text-sm">{saveMsg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card>
          <CardHeader><CardTitle>Contenido de la Sección</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={section.title || ''}
                onChange={(e) => setSection({ ...section, title: e.target.value })}
                placeholder="Título de la sección"
              />
            </div>
            {/* Subtítulo */}
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={section.subtitle || ''}
                onChange={(e) => setSection({ ...section, subtitle: e.target.value })}
                placeholder="Subtítulo de la sección"
              />
            </div>

            {/* Campos dinámicos por tipo */}
            {renderTypeFields(section.section_type, content, updateContent, {
              openFeatures, setOpenFeatures,
              iconPickerOpen, setIconPickerOpen,
              currentFeatureIndex, setCurrentFeatureIndex,
            })}
          </CardContent>
        </Card>

        {/* Preview placeholder */}
        <Card>
          <CardHeader><CardTitle>Vista Previa</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-muted/20 text-center text-muted-foreground text-sm">
              La vista previa en vivo se implementará en la siguiente fase.
              <br />
              <Button variant="outline" className="mt-4" onClick={() => window.open('/', '_blank')}>
                Ver Landing en nueva pestaña
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Render de campos dinámicos según section_type                       */
/* ------------------------------------------------------------------ */

function renderTypeFields(
  sectionType: string,
  content: Record<string, any>,
  updateContent: (key: string, value: any) => void,
  featureStates: {
    openFeatures: Record<number, boolean>;
    setOpenFeatures: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
    iconPickerOpen: boolean;
    setIconPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    currentFeatureIndex: number | null;
    setCurrentFeatureIndex: React.Dispatch<React.SetStateAction<number | null>>;
  },
) {
  const { openFeatures, setOpenFeatures, iconPickerOpen, setIconPickerOpen, currentFeatureIndex, setCurrentFeatureIndex } = featureStates;

  switch (sectionType) {
    case 'hero':
      return <HeroFields content={content} updateContent={updateContent} />;

    case 'benefits':
      return (
        <BenefitsFields
          content={content}
          updateContent={updateContent}
          openFeatures={openFeatures}
          setOpenFeatures={setOpenFeatures}
        />
      );

    case 'pricing':
      return (
        <div className="space-y-3 border-t pt-4 mt-4">
          <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Nota:</strong> Los planes y precios se gestionan desde /admin/plans.
            </p>
          </div>
        </div>
      );

    case 'blog_section':
      return <BlogFields content={content} updateContent={updateContent} />;

    case 'feature_grid':
      return (
        <FeatureGridFields
          content={content}
          updateContent={updateContent}
          openFeatures={openFeatures}
          setOpenFeatures={setOpenFeatures}
          iconPickerOpen={iconPickerOpen}
          setIconPickerOpen={setIconPickerOpen}
          currentFeatureIndex={currentFeatureIndex}
          setCurrentFeatureIndex={setCurrentFeatureIndex}
        />
      );

    case 'cta':
      return <CTAFields content={content} updateContent={updateContent} />;

    default:
      return (
        <div className="text-sm text-muted-foreground">
          No hay campos personalizados para este tipo de sección.
        </div>
      );
  }
}

/* ===== HERO ===== */
function HeroFields({ content, updateContent }: { content: Record<string, any>; updateContent: (k: string, v: any) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea
          value={content.description || ''}
          onChange={(e) => updateContent('description', e.target.value)}
          placeholder="Software contable especializado para MiPymes..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Badge (etiqueta superior)</Label>
        <Input value={content.badge || ''} onChange={(e) => updateContent('badge', e.target.value)} placeholder="Software #1 para MiPymes" />
      </div>

      <div className="space-y-2">
        <Label>Email de Contacto</Label>
        <Input type="email" value={content.email || ''} onChange={(e) => updateContent('email', e.target.value)} placeholder="soporte@contagracia.com" />
      </div>

      <div className="space-y-2">
        <Label>Texto Botón Principal</Label>
        <Input value={content.ctaPrimary || ''} onChange={(e) => updateContent('ctaPrimary', e.target.value)} placeholder="Comenzar" />
      </div>

      <div className="space-y-2">
        <Label>Texto Botón Secundario</Label>
        <Input value={content.ctaSecondary || ''} onChange={(e) => updateContent('ctaSecondary', e.target.value)} placeholder="Soporte WhatsApp" />
      </div>

      {/* Stats */}
      <div className="space-y-3 border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <Label>Estadísticas (máximo 3)</Label>
          {(!content.stats || content.stats.length < 3) && (
            <Button type="button" variant="outline" size="sm" onClick={() => {
              updateContent('stats', [...(content.stats || []), { value: '', label: '' }]);
            }}>
              <Plus className="h-4 w-4 mr-1" />Agregar
            </Button>
          )}
        </div>
        {content.stats?.map((stat: any, i: number) => (
          <div key={i} className="space-y-2 border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Estadística {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                updateContent('stats', content.stats.filter((_: any, idx: number) => idx !== i));
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Input value={stat.value || ''} onChange={(e) => {
              const s = [...content.stats]; s[i] = { ...stat, value: e.target.value }; updateContent('stats', s);
            }} placeholder="500+" />
            <Input value={stat.label || ''} onChange={(e) => {
              const s = [...content.stats]; s[i] = { ...stat, label: e.target.value }; updateContent('stats', s);
            }} placeholder="Empresas Activas" />
          </div>
        ))}
        {(!content.stats || content.stats.length === 0) && (
          <p className="text-sm text-muted-foreground">No hay estadísticas configuradas.</p>
        )}
      </div>

      {/* Imágenes */}
      <div className="space-y-4 border-t pt-4 mt-4">
        <h3 className="font-medium">Imágenes del Hero</h3>
        <ImageUploader id="imageLight" label="Imagen Modo Claro" value={content.imageLight || ''} onChange={(url) => updateContent('imageLight', url)} />
        <ImageUploader id="imageDark" label="Imagen Modo Oscuro" value={content.imageDark || ''} onChange={(url) => updateContent('imageDark', url)} />
        {content.imageLight && !content.imageDark && (
          <Button type="button" variant="outline" size="sm" onClick={() => updateContent('imageDark', content.imageLight)}>
            Copiar imagen claro a oscuro
          </Button>
        )}
      </div>

      <div className="space-y-2 border-t pt-4 mt-4">
        <Label>Color de Fondo (Modo Oscuro)</Label>
        <Input value={content.backgroundColorDark || ''} onChange={(e) => updateContent('backgroundColorDark', e.target.value)} placeholder="bg-slate-900" />
        <p className="text-xs text-muted-foreground">Clase Tailwind para fondo en modo oscuro</p>
      </div>
    </>
  );
}

/* ===== BENEFITS ===== */
function BenefitsFields({ content, updateContent, openFeatures, setOpenFeatures }: {
  content: Record<string, any>; updateContent: (k: string, v: any) => void;
  openFeatures: Record<number, boolean>; setOpenFeatures: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}) {
  return (
    <>
      <div className="space-y-2 border-t pt-4 mt-4">
        <ImageUploader id="benefits-image" label="Imagen" value={content.image || ''} onChange={(url) => updateContent('image', url)} />
        <div className="space-y-2">
          <Label>Texto alternativo de la imagen</Label>
          <Input value={content.imageAlt || ''} onChange={(e) => updateContent('imageAlt', e.target.value)} placeholder="Descripción de la imagen" />
        </div>
      </div>

      <div className="space-y-3 border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <Label>Beneficios</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const idx = (content.benefits || []).length;
            updateContent('benefits', [...(content.benefits || []), { text: '', schedule: '' }]);
            setOpenFeatures((prev) => ({ ...prev, [idx]: true }));
          }}>
            <Plus className="h-4 w-4 mr-1" />Agregar Beneficio
          </Button>
        </div>

        {content.benefits?.map((b: any, i: number) => (
          <Collapsible key={i} open={openFeatures[i] || false} onOpenChange={(o) => setOpenFeatures((prev) => ({ ...prev, [i]: o }))}>
            <div className="border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors">
                <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                  {openFeatures[i] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">{b.text || `Beneficio ${i + 1}`}</span>
                </CollapsibleTrigger>
                <Button type="button" variant="ghost" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  updateContent('benefits', content.benefits.filter((_: any, idx: number) => idx !== i));
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-3">
                  <div className="space-y-2">
                    <Label>Texto del beneficio</Label>
                    <Input value={b.text || ''} onChange={(e) => {
                      const arr = [...content.benefits]; arr[i] = { ...b, text: e.target.value }; updateContent('benefits', arr);
                    }} placeholder="Soporte técnico incluido" />
                  </div>
                  <div className="space-y-2">
                    <Label>Detalles adicionales (opcional)</Label>
                    <Input value={b.schedule || ''} onChange={(e) => {
                      const arr = [...content.benefits]; arr[i] = { ...b, schedule: e.target.value }; updateContent('benefits', arr);
                    }} placeholder="Disponible 24/7" />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

        {(!content.benefits || content.benefits.length === 0) && (
          <p className="text-sm text-muted-foreground">No hay beneficios configurados.</p>
        )}
      </div>
    </>
  );
}

/* ===== BLOG ===== */
function BlogFields({ content, updateContent }: { content: Record<string, any>; updateContent: (k: string, v: any) => void }) {
  return (
    <div className="space-y-3 border-t pt-4 mt-4">
      <div className="space-y-2">
        <Label>Cantidad de posts a mostrar</Label>
        <Input type="number" min="1" max="12" value={content.postsLimit || 3} onChange={(e) => updateContent('postsLimit', parseInt(e.target.value) || 3)} />
      </div>
      <div className="space-y-2">
        <Label>Texto del botón</Label>
        <Input value={content.buttonText || ''} onChange={(e) => updateContent('buttonText', e.target.value)} placeholder="Ver todos los artículos" />
      </div>
      <GradientPicker label="Color del gradiente del título" value={content.titleGradient || 'from-cyan-400 to-blue-500'} onChange={(v) => updateContent('titleGradient', v)} />
      <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Nota:</strong> Los artículos del blog se gestionan desde /admin/blog.
        </p>
      </div>
    </div>
  );
}

/* ===== FEATURE GRID ===== */
function FeatureGridFields({ content, updateContent, openFeatures, setOpenFeatures, iconPickerOpen, setIconPickerOpen, currentFeatureIndex, setCurrentFeatureIndex }: {
  content: Record<string, any>; updateContent: (k: string, v: any) => void;
  openFeatures: Record<number, boolean>; setOpenFeatures: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  iconPickerOpen: boolean; setIconPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentFeatureIndex: number | null; setCurrentFeatureIndex: React.Dispatch<React.SetStateAction<number | null>>;
}) {
  const features: any[] = content.features || [];

  return (
    <>
      <div className="space-y-3 border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <Label>Funcionalidades</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const idx = features.length;
            updateContent('features', [...features, { icon: 'Package', title: '', description: '', color: 'from-purple-500 to-indigo-500' }]);
            setOpenFeatures((prev) => ({ ...prev, [idx]: true }));
          }}>
            <Plus className="h-4 w-4 mr-1" />Agregar
          </Button>
        </div>

        {features.map((f: any, i: number) => {
          const Ico = (LucideIcons as Record<string, any>)[f.icon] || LucideIcons.Package;
          const isOpen = openFeatures[i] || false;
          return (
            <Collapsible key={i} open={isOpen} onOpenChange={(o) => setOpenFeatures((prev) => ({ ...prev, [i]: o }))}>
              <div className="border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors">
                  <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                        <Ico className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{f.title || `Funcionalidad ${i + 1}`}</span>
                    </div>
                  </CollapsibleTrigger>
                  <Button type="button" variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    updateContent('features', features.filter((_: any, idx: number) => idx !== i));
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-3">
                    <div className="space-y-2">
                      <Label>Icono</Label>
                      <Button type="button" variant="outline" className="w-full justify-start" onClick={() => { setCurrentFeatureIndex(i); setIconPickerOpen(true); }}>
                        <Ico className="h-4 w-4 mr-2" />{f.icon || 'Seleccionar icono'}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input value={f.title || ''} onChange={(e) => {
                        const arr = [...features]; arr[i] = { ...f, title: e.target.value }; updateContent('features', arr);
                      }} placeholder="Gestión de Inventario" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea value={f.description || ''} onChange={(e) => {
                        const arr = [...features]; arr[i] = { ...f, description: e.target.value }; updateContent('features', arr);
                      }} placeholder="Control total de tu inventario..." rows={3} />
                    </div>
                    <GradientPicker label="Color del gradiente" value={f.color || 'from-purple-500 to-indigo-500'} onChange={(c) => {
                      const arr = [...features]; arr[i] = { ...f, color: c }; updateContent('features', arr);
                    }} />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {features.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay funcionalidades configuradas.</p>
        )}
      </div>

      <IconPicker
        open={iconPickerOpen}
        onClose={() => { setIconPickerOpen(false); setCurrentFeatureIndex(null); }}
        onSelect={(name) => {
          if (currentFeatureIndex !== null) {
            const arr = [...features]; arr[currentFeatureIndex] = { ...arr[currentFeatureIndex], icon: name }; updateContent('features', arr);
          }
        }}
        currentIcon={currentFeatureIndex !== null ? features[currentFeatureIndex]?.icon : null}
      />
    </>
  );
}

/* ===== CTA ===== */
function CTAFields({ content, updateContent }: { content: Record<string, any>; updateContent: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <Label className="text-base font-semibold">Botón Primario</Label>
        <div className="space-y-2">
          <Label>Texto del botón</Label>
          <Input value={content.primaryButton?.text || ''} onChange={(e) => updateContent('primaryButton', { ...content.primaryButton, text: e.target.value })} placeholder="Prueba Gratuita 7 Días" />
        </div>
        <GradientPicker label="Color del botón" value={content.primaryButton?.color || 'from-purple-600 to-pink-600'} onChange={(c) => updateContent('primaryButton', { ...content.primaryButton, color: c })} />
      </div>

      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <Label className="text-base font-semibold">Botón Secundario</Label>
        <div className="space-y-2">
          <Label>Texto del botón</Label>
          <Input value={content.secondaryButton?.text || ''} onChange={(e) => updateContent('secondaryButton', { ...content.secondaryButton, text: e.target.value })} placeholder="Solicitar Demo" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Texto de beneficios</Label>
        <Input value={content.benefits || ''} onChange={(e) => updateContent('benefits', e.target.value)} placeholder="Sin compromiso • Configuración en 5 minutos • Soporte incluido" />
        <p className="text-xs text-muted-foreground">Texto pequeño debajo de los botones</p>
      </div>

      <GradientPicker label="Color de fondo (Modo Oscuro)" value={content.backgroundColor || 'from-purple-900/50 to-pink-900/50'} onChange={(c) => updateContent('backgroundColor', c)} description="Gradiente de fondo para modo oscuro." />
    </div>
  );
}
