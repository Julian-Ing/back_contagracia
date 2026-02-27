'use client';

/**
 * ComponentRenderer - Renderiza un componente del builder en el canvas
 * Muestra el contenido del componente + borde de selección + controles
 */

import React from 'react';
import { Trash2, Copy, Move, ChevronLeft, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { ContainerComponent } from '@/modules/admin/types/cms.types';
import { useBuilder } from '../BuilderContext';
import { getUploadUrl } from '@/config/api.config';
import { resolveProps } from '@/modules/admin/utils/responsive.utils';

interface ComponentRendererProps {
  component: ContainerComponent;
  sectionId: string;
  isSelected: boolean;
  onClick: () => void;
  flexMode?: boolean;
  flexIndex?: number;
  flexTotal?: number;
}

export function ComponentRenderer({ component, sectionId, isSelected, onClick, flexMode, flexIndex, flexTotal }: ComponentRendererProps) {
  const { deleteComponent, duplicateComponent, reorderComponents, state } = useBuilder();
  const section = flexMode ? state.sections.find(s => s.id === sectionId) : null;
  const rawProps = component.props || {};
  const props = resolveProps(rawProps, state.viewportMode);
  const isHidden = props.visibility === 'hidden';

  const vAlignMap: Record<string, string> = {
    top: 'flex-start', center: 'center', bottom: 'flex-end',
  };

  const gridStyle: React.CSSProperties = flexMode
    ? {
        padding: props.padding as number || 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vAlignMap[(props.verticalAlign as string) || 'top'] || 'flex-start',
        ...(isHidden ? { opacity: 0.3 } : {}),
      }
    : {
        gridRowStart: props.gridRowStart as number || 1,
        gridRowEnd: props.gridRowEnd as number || 2,
        gridColumnStart: props.gridColumnStart as number || 1,
        gridColumnEnd: props.gridColumnEnd as number || 13,
        padding: props.padding as number || 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: vAlignMap[(props.verticalAlign as string) || 'top'] || 'flex-start',
        ...(isHidden ? { opacity: 0.3 } : {}),
      };

  return (
    <div
      className={`relative group cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-1'
          : 'hover:ring-1 hover:ring-indigo-300'
      }`}
      style={gridStyle}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* Hidden badge */}
      {isHidden && (
        <div className="absolute top-1 left-1 z-10 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
          Oculto
        </div>
      )}

      {/* Component content */}
      <div className="w-full flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <ComponentContent type={component.type} props={props} />
      </div>

      {/* Selection controls */}
      {isSelected && (
        <div className="absolute top-1 right-1 flex items-center gap-1 bg-indigo-500 rounded-md px-1 py-0.5 shadow-sm z-20">
          {flexMode && flexIndex !== undefined && flexTotal !== undefined && (
            <>
              <button
                className="p-0.5 text-white hover:bg-indigo-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={flexIndex === 0}
                onPointerDown={(e) => {
                  e.stopPropagation(); e.preventDefault();
                  if (!section || flexIndex === 0) return;
                  const comps = [...(section.components || [])];
                  [comps[flexIndex - 1], comps[flexIndex]] = [comps[flexIndex], comps[flexIndex - 1]];
                  reorderComponents(sectionId, comps);
                }}
                title="Mover antes"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                className="p-0.5 text-white hover:bg-indigo-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={flexIndex === flexTotal - 1}
                onPointerDown={(e) => {
                  e.stopPropagation(); e.preventDefault();
                  if (!section || flexIndex === flexTotal - 1) return;
                  const comps = [...(section.components || [])];
                  [comps[flexIndex], comps[flexIndex + 1]] = [comps[flexIndex + 1], comps[flexIndex]];
                  reorderComponents(sectionId, comps);
                }}
                title="Mover después"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            className="p-0.5 text-white hover:bg-indigo-600 rounded"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); duplicateComponent(sectionId, component.id); }}
            title="Duplicar"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            className="p-0.5 text-white hover:bg-red-500 rounded"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteComponent(sectionId, component.id); }}
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Drag handle (visual only) */}
      <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-move">
        <Move className="w-3 h-3 text-gray-400" />
      </div>

      {/* Type label */}
      <div className="absolute bottom-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] bg-gray-800/70 text-white px-1 rounded-tr">
          {component.type}
        </span>
      </div>
    </div>
  );
}

// ===== Component Content Renderers =====

function ComponentContent({ type, props }: { type: string; props: Record<string, unknown> }) {
  switch (type) {
    case 'heading':
      return <HeadingPreview props={props} />;
    case 'text':
      return <TextPreview props={props} />;
    case 'image':
      return <ImagePreview props={props} />;
    case 'button':
      return <ButtonPreview props={props} />;
    case 'spacer':
      return <SpacerPreview props={props} />;
    case 'divider':
      return <DividerPreview props={props} />;
    case 'icon':
      return <IconPreview props={props} />;
    case 'card':
      return <CardPreview props={props} />;
    case 'video':
      return <VideoPreview props={props} />;
    case 'gallery':
      return <GalleryPreview props={props} />;
    case 'testimonial':
      return <TestimonialPreview props={props} />;
    case 'stat':
      return <StatPreview props={props} />;
    case 'columns':
      return <ColumnsPreview props={props} />;
    default:
      return <div className="p-4 bg-gray-100 dark:bg-slate-700 text-sm text-gray-500 rounded">Componente: {type}</div>;
  }
}

function HeadingPreview({ props }: { props: Record<string, unknown> }) {
  const level = (props.level as string) || 'h2';
  const sizeMap: Record<string, string> = {
    h1: 'text-4xl', h2: 'text-3xl', h3: 'text-2xl', h4: 'text-xl', h5: 'text-lg', h6: 'text-base',
  };
  const useAutoColor = props.autoColor === undefined || props.autoColor === true || props.autoColor === 'true';
  const className = `font-bold ${sizeMap[level] || 'text-2xl'} ${useAutoColor ? 'text-foreground' : ''}`;
  const style: React.CSSProperties = {
    textAlign: (props.alignment as React.CSSProperties['textAlign']) || 'left',
    ...(!useAutoColor && (props.color as string) ? { color: props.color as string } : {}),
    fontSize: (props.fontSize as number) > 0 ? `${props.fontSize}px` : undefined,
    width: '100%',
  };
  const content = (props.content as string) || 'Encabezado';
  return React.createElement(level, { className, style }, content);
}

function TextPreview({ props }: { props: Record<string, unknown> }) {
  const useAutoColor = props.autoColor === undefined || props.autoColor === true || props.autoColor === 'true';
  return (
    <p
      className={useAutoColor ? 'text-muted-foreground' : ''}
      style={{
        textAlign: (props.alignment as React.CSSProperties['textAlign']) || 'left',
        ...(!useAutoColor && (props.color as string) ? { color: props.color as string } : {}),
        fontSize: `${(props.fontSize as number) || 16}px`,
        whiteSpace: 'pre-wrap',
        width: '100%',
      }}
    >
      {(props.content as string) || 'Tu texto aquí...'}
    </p>
  );
}

function ImagePreview({ props }: { props: Record<string, unknown> }) {
  const src = props.src as string;
  const hAlign = (props.alignment as string) || 'center';
  const vAlign = (props.verticalAlign as string) || 'center';
  const fit = (props.objectFit as string) || 'cover';
  const radius = (props.borderRadius as number) || 0;

  if (!src) {
    return (
      <div className="w-full h-full min-h-[80px] bg-gray-100 dark:bg-slate-700 flex items-center justify-center rounded">
        <LucideIcons.ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  const flexH: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const flexV: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: flexH[hAlign] || 'center',
        alignItems: flexV[vAlign] || 'center',
        overflow: 'hidden',
        borderRadius: `${radius}px`,
      }}
    >
      <img
        src={getUploadUrl(src)}
        alt={(props.alt as string) || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit as React.CSSProperties['objectFit'],
          objectPosition: fit === 'contain' ? undefined : `${hAlign} ${vAlign}`,
          borderRadius: `${radius}px`,
          display: 'block',
        }}
      />
    </div>
  );
}

function ButtonPreview({ props }: { props: Record<string, unknown> }) {
  const variant = (props.variant as string) || 'primary';
  const size = (props.size as string) || 'md';
  const sizeClasses: Record<string, string> = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };
  const bgColor = (props.bgColor as string) || '#6366f1';

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: bgColor, color: '#fff' },
    secondary: { backgroundColor: `${bgColor}20`, color: bgColor, border: `1px solid ${bgColor}40` },
    outline: { border: `2px solid ${bgColor}`, color: bgColor, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent', color: bgColor },
  };

  const hAlign = (props.alignment as string) || 'center';
  const vAlign = (props.verticalAlign as string) || 'center';
  const flexH: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const flexV: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: flexV[vAlign] || 'center',
      alignItems: flexH[hAlign] || 'center',
      width: '100%',
      height: '100%',
    }}>
      <span
        className={`inline-block font-medium ${sizeClasses[size] || sizeClasses.md}`}
        style={{
          ...variantStyles[variant] || variantStyles.primary,
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        {(props.text as string) || 'Botón'}
      </span>
    </div>
  );
}

function SpacerPreview({ props }: { props: Record<string, unknown> }) {
  const height = (props.height as number) || 32;
  return (
    <div
      className="bg-gray-100/50 dark:bg-slate-700/30 w-full flex items-center justify-center"
      style={{ height: `${height}px` }}
    >
      <span className="text-[10px] text-gray-400">Espaciador ({height}px)</span>
    </div>
  );
}

function DividerPreview({ props }: { props: Record<string, unknown> }) {
  const color = (props.color as string) || '#e5e7eb';
  const thickness = (props.thickness as number) || 1;
  const borderStyle = (props.style as string) || 'solid';
  return (
    <div className="flex justify-center w-full py-2">
      <div style={{
        width: '100%',
        height: 0,
        borderTop: `${thickness}px ${borderStyle} ${color}`,
      }} />
    </div>
  );
}

function IconPreview({ props }: { props: Record<string, unknown> }) {
  const iconName = (props.iconName as string) || 'Heart';
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>>)[iconName]
    || (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>>).Heart;
  const size = (props.size as number) || 48;
  const hAlign = (props.alignment as string) || 'center';
  const flexH: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

  return (
    <div style={{
      display: 'flex',
      justifyContent: flexH[hAlign] || 'center',
      width: '100%',
      height: '100%',
    }}>
      {IconComp ? (
        <IconComp size={size} color={(props.color as string) || '#6366f1'} strokeWidth={2} />
      ) : (
        <div className="text-sm text-gray-400">Icono: {iconName}</div>
      )}
    </div>
  );
}

function CardPreview({ props }: { props: Record<string, unknown> }) {
  const titleSize = (props.titleSize as string) || 'text-lg';
  const descriptionSize = (props.descriptionSize as string) || 'text-sm';
  const textAlign = (props.textAlign as string) || 'left';
  const buttonColor = (props.buttonColor as string) || '#6366f1';
  const imageSrc = props.imageSrc as string;

  return (
    <div
      style={{
        backgroundColor: (props.bgColor as string) || '#ffffff',
        borderRadius: `${(props.borderRadius as number) || 8}px`,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e5e7eb',
      }}
    >
      {imageSrc && (
        <img
          src={getUploadUrl(imageSrc)}
          alt={(props.title as string) || ''}
          style={{ width: '100%', height: `${(props.imageHeight as number) || 200}px`, objectFit: 'cover' }}
        />
      )}
      <div style={{ padding: `${(props.padding as number) || 16}px`, flex: 1, textAlign: textAlign as React.CSSProperties['textAlign'] }}>
        <h3
          className={`${titleSize} font-semibold`}
          style={{ color: (props.titleColor as string) || '#000000', marginBottom: '8px' }}
        >
          {(props.title as string) || 'Titulo'}
        </h3>
        <p
          className={descriptionSize}
          style={{
            color: (props.descriptionColor as string) || '#666666',
            marginBottom: (props.buttonText as string) ? '16px' : '0',
            whiteSpace: 'pre-wrap',
          }}
        >
          {(props.description as string) || 'Descripcion'}
        </p>
        {(props.buttonText as string) && (
          <span
            style={{
              backgroundColor: buttonColor,
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              display: 'inline-block',
              fontSize: '14px',
            }}
          >
            {props.buttonText as string}
          </span>
        )}
      </div>
    </div>
  );
}

function VideoPreview({ props }: { props: Record<string, unknown> }) {
  const url = (props.url as string) || '';
  const borderRadius = (props.borderRadius as number) || 8;
  const autoplay = props.autoplay === true || props.autoplay === 'true';

  if (!url) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded p-4 text-center flex items-center justify-center"
        style={{ borderRadius: `${borderRadius}px`, minHeight: '120px' }}
      >
        <div>
          <LucideIcons.Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-400">Agrega una URL de YouTube o Vimeo</p>
        </div>
      </div>
    );
  }

  // Parse YouTube/Vimeo URLs with regex
  const getEmbedUrl = (videoUrl: string): string => {
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=${autoplay ? '1' : '0'}`;
    }
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${autoplay ? '1' : '0'}`;
    }
    return videoUrl;
  };

  const embedUrl = getEmbedUrl(url);
  const aspectRatio = (props.aspectRatio as string) || '16:9';
  const paddingBottom = aspectRatio === '4:3' ? '75%' : aspectRatio === '1:1' ? '100%' : '56.25%';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      paddingBottom,
      borderRadius: `${borderRadius}px`,
      overflow: 'hidden',
    }}>
      <iframe
        src={embedUrl}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function GalleryPreview({ props }: { props: Record<string, unknown> }) {
  const url = (props.imageUrl as string) || '';
  const borderRadius = (props.borderRadius as number) || 8;

  if (!url) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded flex items-center justify-center"
        style={{ height: '100%', minHeight: '80px', borderRadius: `${borderRadius}px` }}
      >
        <div className="text-center">
          <LucideIcons.ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-400">Agrega una URL de imagen</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', borderRadius: `${borderRadius}px`,
    }}>
      <img
        src={getUploadUrl(url)}
        alt={(props.alt as string) || ''}
        style={{
          width: '100%', height: '100%',
          objectFit: (props.objectFit as React.CSSProperties['objectFit']) || 'cover',
          borderRadius: `${borderRadius}px`,
        }}
      />
    </div>
  );
}

function TestimonialPreview({ props }: { props: Record<string, unknown> }) {
  const isHorizontal = (props.layout as string) === 'horizontal';
  const textAlign = (props.textAlign as string) || (props.alignment as string) || 'center';
  const showQuoteIcon = props.showQuoteIcon === true || props.showQuoteIcon === 'true';
  const photoUrl = props.photoUrl as string;
  const QuoteIcon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>>).Quote;

  return (
    <div
      style={{
        backgroundColor: (props.bgColor as string) || '#ffffff',
        borderRadius: `${(props.borderRadius as number) || 12}px`,
        padding: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        alignItems: isHorizontal ? 'center' : textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
        gap: '16px',
        border: '1px solid #e5e7eb',
        textAlign: textAlign as React.CSSProperties['textAlign'],
      }}
    >
      {/* Photo */}
      {photoUrl && (
        <img
          src={getUploadUrl(photoUrl)}
          alt={(props.name as string) || ''}
          style={{
            width: isHorizontal ? '80px' : '100px',
            height: isHorizontal ? '80px' : '100px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1 }}>
        {showQuoteIcon && QuoteIcon && (
          <QuoteIcon
            size={32}
            style={{ color: (props.quoteIconColor as string) || '#6366f1', opacity: 0.2, marginBottom: '8px' }}
          />
        )}
        <p style={{
          color: (props.quoteColor as string) || '#1a1a1a',
          fontSize: '16px', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '16px',
        }}>
          &ldquo;{(props.quote as string) || 'Testimonio de ejemplo'}&rdquo;
        </p>
        <p style={{
          color: (props.nameColor as string) || '#1a1a1a',
          fontSize: '16px', fontWeight: 600, marginBottom: '4px',
        }}>
          {(props.name as string) || 'Nombre del Cliente'}
        </p>
        <p style={{ color: (props.positionColor as string) || '#666666', fontSize: '14px' }}>
          {(props.position as string) || 'Cargo'}{(props.company as string) ? `, ${props.company}` : ''}
        </p>
      </div>
    </div>
  );
}

function StatPreview({ props }: { props: Record<string, unknown> }) {
  const isHorizontal = (props.layout as string) === 'horizontal';
  const showIcon = props.showIcon === true || props.showIcon === 'true';
  const iconName = (props.iconName as string) || 'TrendingUp';
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>>)[iconName]
    || (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>>).TrendingUp;

  return (
    <div
      style={{
        backgroundColor: (props.bgColor as string) || '#ffffff',
        borderRadius: `${(props.borderRadius as number) || 12}px`,
        padding: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
      }}
    >
      {showIcon && IconComp && (
        <IconComp
          size={parseInt(String(props.iconSize)) || 40}
          style={{ color: (props.iconColor as string) || '#6366f1' }}
          strokeWidth={2}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{
          color: (props.valueColor as string) || '#1a1a1a',
          fontSize: `${(props.valueSize as number) || 48}px`,
          fontWeight: 700,
          lineHeight: 1,
        }}>
          {(props.value as string) || '500+'}
        </div>
        <div style={{
          color: (props.labelColor as string) || '#666666',
          fontSize: '14px',
          fontWeight: 500,
        }}>
          {(props.label as string) || 'Clientes Felices'}
        </div>
      </div>
    </div>
  );
}

function ColumnsPreview({ props }: { props: Record<string, unknown> }) {
  const count = Number(props.columnCount) || 2;
  const ratio = (props.columnRatio as string) || 'equal';

  const getGridTemplate = (c: number, r: string): string => {
    if (c === 2) {
      if (r === '1-2') return '1fr 2fr';
      if (r === '2-1') return '2fr 1fr';
      return '1fr 1fr';
    }
    if (c === 3) {
      if (r === '1-2-1') return '1fr 2fr 1fr';
      return '1fr 1fr 1fr';
    }
    return Array(c).fill('1fr').join(' ');
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: getGridTemplate(count, ratio),
        gap: `${(props.gap as number) || 16}px`,
        width: '100%',
        height: '100%',
        backgroundColor: (props.bgColor as string) || 'transparent',
        borderRadius: `${(props.borderRadius as number) || 0}px`,
        padding: `${(props.padding as number) || 0}px`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-md p-4 flex items-center justify-center text-gray-400 text-sm"
          style={{ minHeight: '120px' }}
        >
          <div className="text-center">
            <LucideIcons.Columns className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Columna {i + 1}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
