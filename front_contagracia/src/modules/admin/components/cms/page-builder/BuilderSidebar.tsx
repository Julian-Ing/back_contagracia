'use client';

/**
 * BuilderSidebar - Panel izquierdo de propiedades
 * Tabs Contenido/Estilo según componente o sección seleccionada
 */

import React, { useState } from 'react';
import { Settings2, Paintbrush, Layers, Monitor, Tablet, Smartphone, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Select } from '@/shared/components/ui/select';
import { useBuilder } from './BuilderContext';
import { getComponentByType, FLEX_POSITION_PROPS, type ComponentProperty } from './ComponentRegistry';
import { getBlockByType } from './BlockRegistry';
import { IconPicker } from '../IconPicker';
import { ImageUploader } from '../ImageUploader';
import type { ContainerContent } from '@/modules/admin/types/cms.types';

const VIEWPORT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

export function BuilderSidebar() {
  const {
    state, getSelectedSection, getSelectedComponent, updateComponent,
    updateSectionLayout, updateSection, updateComponentResponsiveProp,
    updateSectionLayoutResponsive, resolveComponentProps, resolveSectionContent,
    clearResponsiveOverride, hasResponsiveOverride, copyDesktopToViewport,
  } = useBuilder();
  const [tab, setTab] = useState<'content' | 'style'>('content');

  const selectedSection = getSelectedSection();
  const selectedComp = getSelectedComponent();
  const viewport = state.viewportMode;

  // Si hay componente seleccionado, mostrar sus propiedades
  if (state.selectedComponent && selectedComp) {
    const compDef = getComponentByType(selectedComp.type);
    if (!compDef) return <EmptySidebar />;

    // Check if component is inside a flex section
    const parentSection = state.sections.find(s => s.id === state.selectedComponent!.sectionId);
    const isFlexSection = parentSection?.section_type === 'flex-container';
    const gridPropKeys = new Set(['gridRowStart', 'gridRowEnd', 'gridColumnStart', 'gridColumnEnd', 'gridRow', 'padding', 'visibility']);

    let allProps = compDef.properties;
    if (isFlexSection) {
      // Remove grid position props, add flex position props
      allProps = [
        ...allProps.filter(p => !gridPropKeys.has(p.key)),
        ...FLEX_POSITION_PROPS,
      ];
    }

    const contentProps = allProps.filter(p => (p.tab || 'content') === 'content');
    const styleProps = allProps.filter(p => p.tab === 'style');
    const resolvedProps = resolveComponentProps(selectedComp.props);

    const handleChange = (key: string, value: unknown, isResponsive?: boolean) => {
      if (isResponsive) {
        // Use responsive-aware updater for all responsive props (reads latest state internally)
        updateComponentResponsiveProp(state.selectedComponent!.sectionId, selectedComp.id, key, value);
      } else {
        updateComponent(state.selectedComponent!.sectionId, selectedComp.id, {
          props: { ...selectedComp.props, [key]: value },
        });
      }
    };

    return (
      <SidebarShell
        tab={tab}
        onTabChange={setTab}
        title={compDef.label}
        viewport={viewport}
        onCopyDesktop={() => copyDesktopToViewport(state.selectedComponent!.sectionId, selectedComp.id, allProps.filter(p => p.responsive).map(p => p.key))}
      >
        {tab === 'content' ? (
          <PropertyList
            properties={contentProps}
            values={resolvedProps}
            rawProps={selectedComp.props}
            viewport={viewport}
            onChange={handleChange}
            onClearOverride={(key) => clearResponsiveOverride(state.selectedComponent!.sectionId, selectedComp.id, key)}
            hasOverride={(key) => hasResponsiveOverride(selectedComp.props, key)}
          />
        ) : (
          <PropertyList
            properties={styleProps}
            values={resolvedProps}
            rawProps={selectedComp.props}
            viewport={viewport}
            onChange={handleChange}
            onClearOverride={(key) => clearResponsiveOverride(state.selectedComponent!.sectionId, selectedComp.id, key)}
            hasOverride={(key) => hasResponsiveOverride(selectedComp.props, key)}
          />
        )}
      </SidebarShell>
    );
  }

  // Si hay sección seleccionada, mostrar propiedades del bloque
  if (selectedSection) {
    const blockDef = getBlockByType(selectedSection.section_type);
    const rawContent = (selectedSection.content || {}) as Record<string, unknown>;
    const resolvedContent = resolveSectionContent(rawContent);

    return (
      <div className="w-72 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full shrink-0">
        <div className="p-3 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sección: {selectedSection.title || selectedSection.section_key}
            </span>
          </div>
          {/* Section title edit */}
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input
              value={selectedSection.title || ''}
              onChange={(e) => updateSection(selectedSection.id, { title: e.target.value })}
              placeholder="Título de la sección"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Block properties */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {blockDef?.properties.map((prop) => {
            const isResponsive = prop.responsive === true;
            return (
              <div key={prop.key}>
                {isResponsive && viewport !== 'desktop' && (
                  <div className="flex items-center justify-between mb-0.5">
                    <ViewportBadge viewport={viewport} />
                    {(rawContent._responsive as Record<string, Record<string, unknown>> | undefined)?.[viewport]?.[prop.key] !== undefined && (
                      <button
                        onClick={() => {
                          const resp = { ...((rawContent._responsive as Record<string, Record<string, unknown>> | undefined)?.[viewport] || {}) };
                          delete resp[prop.key];
                          const newResponsive = { ...(rawContent._responsive as Record<string, unknown> || {}), [viewport]: resp };
                          updateSectionLayout(selectedSection.id, { _responsive: newResponsive } as unknown as Partial<ContainerContent>);
                        }}
                        className="flex items-center gap-0.5 text-[10px] text-red-400 hover:text-red-500"
                        title="Resetear a valor de desktop"
                      >
                        <X className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                )}
                <PropertyField
                  property={prop as ComponentProperty}
                  value={resolvedContent[prop.key]}
                  onChange={(value) => {
                    if (isResponsive && viewport !== 'desktop') {
                      updateSectionLayoutResponsive(selectedSection.id, prop.key, value);
                    } else {
                      updateSectionLayout(selectedSection.id, { [prop.key]: value } as Partial<ContainerContent>);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return <EmptySidebar />;
}

function ViewportBadge({ viewport }: { viewport: string }) {
  const Icon = VIEWPORT_ICONS[viewport] || Monitor;
  return (
    <div className="flex items-center gap-1 mb-0.5">
      <Icon className="w-3 h-3 text-indigo-400" />
      <span className="text-[10px] text-indigo-400 uppercase font-medium">{viewport}</span>
    </div>
  );
}

function EmptySidebar() {
  return (
    <div className="w-72 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-center h-full shrink-0 text-center p-6">
      <Settings2 className="w-8 h-8 text-gray-300 dark:text-slate-600 mb-3" />
      <p className="text-sm text-gray-400 dark:text-gray-500">
        Selecciona una sección o componente para editar sus propiedades.
      </p>
    </div>
  );
}

interface SidebarShellProps {
  children: React.ReactNode;
  tab: 'content' | 'style';
  onTabChange: (tab: 'content' | 'style') => void;
  title: string;
  viewport?: string;
  onCopyDesktop?: () => void;
}

function SidebarShell({ children, tab, onTabChange, title, viewport, onCopyDesktop }: SidebarShellProps) {
  return (
    <div className="w-72 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-700">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => onTabChange('content')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium ${
            tab === 'content'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Contenido
        </button>
        <button
          onClick={() => onTabChange('style')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium ${
            tab === 'style'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5" />
          Estilo
        </button>
      </div>

      {/* Copy desktop button */}
      {viewport && viewport !== 'desktop' && onCopyDesktop && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={onCopyDesktop}
            className="w-full text-[11px] py-1.5 px-2 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            Copiar valores de desktop a {viewport}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

interface PropertyListProps {
  properties: ComponentProperty[];
  values: Record<string, unknown>;
  rawProps: Record<string, unknown>;
  viewport: string;
  onChange: (key: string, value: unknown, isResponsive?: boolean) => void;
  onClearOverride: (key: string) => void;
  hasOverride: (key: string) => boolean;
}

function PropertyList({ properties, values, rawProps, viewport, onChange, onClearOverride, hasOverride }: PropertyListProps) {
  return (
    <>
      {properties.map((prop) => {
        const isResponsive = prop.responsive === true;
        const showViewportBadge = isResponsive && viewport !== 'desktop';
        const hasOvr = isResponsive && viewport !== 'desktop' && hasOverride(prop.key);

        return (
          <div key={prop.key}>
            {showViewportBadge && (
              <div className="flex items-center justify-between mb-0.5">
                <ViewportBadge viewport={viewport} />
                {hasOvr && (
                  <button
                    onClick={() => onClearOverride(prop.key)}
                    className="flex items-center gap-0.5 text-[10px] text-red-400 hover:text-red-500"
                    title="Resetear a valor de desktop"
                  >
                    <X className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            )}
            <PropertyField
              property={prop}
              value={values[prop.key]}
              onChange={(value) => onChange(prop.key, value, isResponsive)}
            />
          </div>
        );
      })}
    </>
  );
}

interface PropertyFieldProps {
  property: ComponentProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}

function PropertyField({ property, value, onChange }: PropertyFieldProps) {
  const { key, label, type } = property;

  switch (type) {
    case 'text':
    case 'url':
      return (
        <div className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label}
            className="h-8 text-xs"
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={property.rows || 3}
            className="w-full rounded-md border border-gray-200 dark:border-slate-600 bg-transparent px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Input
            type="number"
            value={(value as number) ?? property.default}
            onChange={(e) => onChange(Number(e.target.value))}
            min={property.min}
            max={property.max}
            step={property.step}
            className="h-8 text-xs"
          />
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Select
            options={property.options || []}
            value={String(value ?? property.default)}
            onChange={(val) => onChange(val)}
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{label}</Label>
          <Switch
            checked={value as boolean ?? property.default as boolean}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case 'color':
      return (
        <div className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 dark:border-slate-600 cursor-pointer"
            />
            <Input
              value={(value as string) || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#hex"
              className="h-8 text-xs flex-1"
            />
          </div>
        </div>
      );

    case 'icon':
      return <IconField label={label} value={(value as string) || ''} onChange={(v: string) => onChange(v)} />;

    case 'image':
      return (
        <div className="space-y-1">
          <ImageUploader
            id={key}
            label={label}
            value={(value as string) || ''}
            onChange={(url) => onChange(url)}
          />
        </div>
      );

    default:
      return null;
  }
}

function IconField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const IconComp = value ? (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[value] : null;

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full h-8 px-3 rounded-md border border-gray-200 dark:border-slate-600 text-xs hover:bg-gray-50 dark:hover:bg-slate-700"
      >
        {IconComp && <IconComp className="w-4 h-4 text-indigo-500" />}
        <span className="text-gray-600 dark:text-gray-300">{value || 'Seleccionar icono'}</span>
      </button>
      <IconPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(name) => { onChange(name); setOpen(false); }}
        currentIcon={value}
      />
    </div>
  );
}
