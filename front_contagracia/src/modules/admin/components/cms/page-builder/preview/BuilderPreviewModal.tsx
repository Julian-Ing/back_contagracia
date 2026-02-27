'use client';

/**
 * BuilderPreviewModal - Modal fullscreen con preview de la página construida
 */

import React from 'react';
import { X, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useBuilder, type ViewportMode } from '../BuilderContext';
import type { ContainerContent, ContainerComponent } from '@/modules/admin/types/cms.types';

// Re-use ComponentContent from ComponentRenderer (inline simplified versions)
import * as LucideIcons from 'lucide-react';
import { getUploadUrl } from '@/config/api.config';

interface BuilderPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pageTitle: string;
}

const VIEWPORT_WIDTHS: Record<ViewportMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function BuilderPreviewModal({ open, onClose, pageTitle }: BuilderPreviewModalProps) {
  const { state } = useBuilder();
  const [previewViewport, setPreviewViewport] = React.useState<ViewportMode>('desktop');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
      <div className="h-12 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Vista previa: {pageTitle}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
            {([
              { mode: 'desktop' as ViewportMode, icon: Monitor },
              { mode: 'tablet' as ViewportMode, icon: Tablet },
              { mode: 'mobile' as ViewportMode, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setPreviewViewport(mode)}
                className={`p-1.5 rounded-md ${
                  previewViewport === mode
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900 flex justify-center p-6">
        <div
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl transition-all duration-300"
          style={{ width: VIEWPORT_WIDTHS[previewViewport], maxWidth: '100%', height: 'fit-content' }}
        >
          {state.sections.map((section) => {
            const content = (section.content || {}) as ContainerContent;
            const components = section.components || [];

            if (section.section_type === 'flex-container') {
              return (
                <div key={section.id} style={{ padding: `${(content as unknown as Record<string,unknown>).padding ?? 24}px` }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: ((content as unknown as Record<string,unknown>).direction as React.CSSProperties['flexDirection']) || 'row',
                      flexWrap: ((content as unknown as Record<string,unknown>).wrap as React.CSSProperties['flexWrap']) || 'wrap',
                      justifyContent: ((content as unknown as Record<string,unknown>).justifyContent as string) || 'flex-start',
                      alignItems: ((content as unknown as Record<string,unknown>).alignItems as string) || 'stretch',
                      gap: `${(content as unknown as Record<string,unknown>).gap ?? 16}px`,
                      borderRadius: `${(content as unknown as Record<string,unknown>).borderRadius || 0}px`,
                    }}
                  >
                    {components.map((comp) => {
                      const p = comp.props || {};
                      return (
                        <div
                          key={comp.id}
                          style={{
                            flexBasis: (p.flexBasis as string) || 'auto',
                            flexGrow: (p.flexGrow as number) ?? 0,
                          }}
                        >
                          <PreviewComponent component={comp} flexMode />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={section.id} style={{ padding: `${content.padding ?? 24}px` }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: `repeat(${content.gridRows || 3}, ${content.cellHeight || 100}px)`,
                    gridTemplateColumns: `repeat(${content.gridColumns || 12}, 1fr)`,
                    gap: `${content.gap ?? 16}px`,
                    borderRadius: `${content.borderRadius || 0}px`,
                  }}
                >
                  {components.map((comp) => (
                    <PreviewComponent key={comp.id} component={comp} />
                  ))}
                </div>
              </div>
            );
          })}
          {state.sections.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              No hay secciones para previsualizar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewComponent({ component, flexMode }: { component: ContainerComponent; flexMode?: boolean }) {
  const props = component.props || {};
  const vAlignMap: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

  return (
    <div
      style={flexMode ? {
        padding: (props.padding as number) || 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vAlignMap[(props.verticalAlign as string) || 'top'] || 'flex-start',
      } : {
        gridRowStart: (props.gridRowStart as number) || 1,
        gridRowEnd: (props.gridRowEnd as number) || 2,
        gridColumnStart: (props.gridColumnStart as number) || 1,
        gridColumnEnd: (props.gridColumnEnd as number) || 13,
        padding: (props.padding as number) || 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vAlignMap[(props.verticalAlign as string) || 'top'] || 'flex-start',
      }}
    >
      <SimpleComponentRender type={component.type} props={props} />
    </div>
  );
}

function SimpleComponentRender({ type, props }: { type: string; props: Record<string, unknown> }) {
  switch (type) {
    case 'heading': {
      const level = ((props.level as string) || 'h2');
      return React.createElement(level, { style: { textAlign: (props.alignment as React.CSSProperties['textAlign']), color: (props.color as string) || undefined, fontSize: (props.fontSize as number) > 0 ? `${props.fontSize}px` : undefined }, className: 'font-bold' }, (props.content as string) || '');
    }
    case 'text':
      return <p style={{ textAlign: (props.alignment as React.CSSProperties['textAlign']), color: (props.color as string) || undefined, fontSize: `${(props.fontSize as number) || 16}px` }}>{(props.content as string) || ''}</p>;
    case 'image':
      return (props.src as string) ? <img src={getUploadUrl(props.src as string)} alt={(props.alt as string) || ''} className="w-full h-full" style={{ objectFit: (props.objectFit as React.CSSProperties['objectFit']) || 'cover', borderRadius: `${(props.borderRadius as number) || 0}px` }} /> : <div className="bg-gray-100 rounded h-full" />;
    case 'button':
      return <div style={{ textAlign: (props.alignment as React.CSSProperties['textAlign']) || 'center' }}><span className="inline-block px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: (props.bgColor as string) || '#6366f1' }}>{(props.text as string) || 'Botón'}</span></div>;
    case 'spacer':
      return <div style={{ height: (props.height as number) || 32 }} />;
    case 'divider':
      return <hr style={{ borderColor: (props.color as string) || '#e5e7eb', borderWidth: (props.thickness as number) || 1, borderStyle: (props.style as string) || 'solid' }} />;
    case 'icon': {
      const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>)[(props.iconName as string) || 'Heart'];
      return <div style={{ textAlign: (props.alignment as React.CSSProperties['textAlign']) || 'center' }}>{Icon ? <Icon style={{ width: (props.size as number) || 48, height: (props.size as number) || 48, color: (props.color as string) || '#6366f1', display: 'inline-block' }} /> : null}</div>;
    }
    default:
      return <div className="p-2 bg-gray-100 rounded text-sm text-gray-500">{type}</div>;
  }
}
