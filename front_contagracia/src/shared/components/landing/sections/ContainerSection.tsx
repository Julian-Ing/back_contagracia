'use client';

/**
 * ContainerSection - Renderiza secciones tipo 'container' del Page Builder
 * en la vista pública. Grid CSS con componentes posicionados.
 */

import React, { type JSX } from 'react';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import type { SiteSection } from '@/modules/admin/types/cms.types';
import { getUploadUrl } from '@/config/api.config';

interface ContainerSectionProps {
  section: SiteSection;
}

const COLOR_PRESET_CLASSES: Record<string, string> = {
  white: 'bg-white dark:bg-gray-950',
  gray: 'bg-gray-100 dark:bg-gray-800',
  dark: 'bg-gray-900 dark:bg-gray-950',
  blue: 'bg-blue-50 dark:bg-blue-950',
  purple: 'bg-purple-50 dark:bg-purple-950',
  green: 'bg-green-50 dark:bg-green-950',
  orange: 'bg-orange-50 dark:bg-orange-950',
  'gradient-blue': 'bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-gray-800 dark:to-gray-900',
  'gradient-purple': 'bg-gradient-to-br from-pink-400 to-rose-500 dark:from-purple-900 dark:to-purple-950',
  'gradient-sunset': 'bg-gradient-to-br from-pink-500 to-yellow-400 dark:from-orange-900 dark:to-amber-950',
};

export function ContainerSection({ section }: ContainerSectionProps) {
  const content = section.content || {};
  const sectionId = section.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const backgroundPreset = (content.backgroundPreset as string) || 'white';
  const backgroundColor = (content.backgroundColor as string) || '#ffffff';
  const gridRows = (content.gridRows as number) || 3;
  const gridColumns = (content.gridColumns as number) || 12;
  const cellHeight = (content.cellHeight as number) || 100;
  const gap = (content.gap as number) ?? 16;
  const padding = (content.padding as number) ?? 24;
  const borderRadius = (content.borderRadius as number) || 0;

  const bgClass = COLOR_PRESET_CLASSES[backgroundPreset] || '';
  const components = (content.components as Array<{ id: string; type: string; props: Record<string, unknown> }>) || [];
  const responsive = (content._responsive as Record<string, Record<string, unknown>>) || {};

  const sClass = `grid-section-${sectionId}`;

  // Generate scoped CSS with media queries
  const generateStyles = () => {
    let css = `
      .${sClass} {
        display: grid;
        grid-template-columns: repeat(${gridColumns}, 1fr);
        grid-template-rows: repeat(${gridRows}, ${cellHeight}px);
        gap: ${gap}px;
      }
    `;

    // Component positions (base)
    components.forEach((comp) => {
      const p = comp.props || {};
      const cClass = `grid-comp-${comp.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      css += `
        .${cClass} {
          grid-row: ${(p.gridRowStart as number) || 1} / ${(p.gridRowEnd as number) || 2};
          grid-column: ${(p.gridColumnStart as number) || 1} / ${(p.gridColumnEnd as number) || 13};
          overflow: hidden;
          ${p.visibility === 'hidden' ? 'display: none;' : ''}
        }
      `;
    });

    // Tablet
    const tablet = responsive.tablet || {};
    if (Object.keys(tablet).length > 0 || components.some(c => (c.props?._responsive as Record<string, unknown>)?.tablet)) {
      css += `@media (max-width: 1024px) {`;
      if (Object.keys(tablet).length > 0) {
        css += `
          .${sClass} {
            ${tablet.gridColumns !== undefined ? `grid-template-columns: repeat(${tablet.gridColumns}, 1fr);` : ''}
            ${tablet.gridRows !== undefined ? `grid-template-rows: repeat(${tablet.gridRows}, ${tablet.cellHeight || cellHeight}px);` : ''}
            ${tablet.cellHeight !== undefined && tablet.gridRows === undefined ? `grid-template-rows: repeat(${gridRows}, ${tablet.cellHeight}px);` : ''}
            ${tablet.gap !== undefined ? `gap: ${tablet.gap}px;` : ''}
          }
        `;
      }
      components.forEach((comp) => {
        const r = ((comp.props?._responsive as Record<string, Record<string, unknown>>) || {}).tablet;
        if (r) {
          const cClass = `grid-comp-${comp.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          css += `
            .${cClass} {
              ${r.gridRowStart !== undefined || r.gridRowEnd !== undefined ? `grid-row: ${r.gridRowStart || (comp.props.gridRowStart as number) || 1} / ${r.gridRowEnd || (comp.props.gridRowEnd as number) || 2};` : ''}
              ${r.gridColumnStart !== undefined || r.gridColumnEnd !== undefined ? `grid-column: ${r.gridColumnStart || (comp.props.gridColumnStart as number) || 1} / ${r.gridColumnEnd || (comp.props.gridColumnEnd as number) || 13};` : ''}
              ${r.visibility === 'hidden' ? 'display: none;' : r.visibility === 'visible' ? 'display: block;' : ''}
            }
          `;
        }
      });
      css += '}';
    }

    // Mobile
    const mobile = responsive.mobile || {};
    if (Object.keys(mobile).length > 0 || components.some(c => (c.props?._responsive as Record<string, unknown>)?.mobile)) {
      css += `@media (max-width: 768px) {`;
      if (Object.keys(mobile).length > 0) {
        css += `
          .${sClass} {
            ${mobile.gridColumns !== undefined ? `grid-template-columns: repeat(${mobile.gridColumns}, 1fr);` : ''}
            ${mobile.gridRows !== undefined ? `grid-template-rows: repeat(${mobile.gridRows}, ${mobile.cellHeight || cellHeight}px);` : ''}
            ${mobile.cellHeight !== undefined && mobile.gridRows === undefined ? `grid-template-rows: repeat(${gridRows}, ${mobile.cellHeight}px);` : ''}
            ${mobile.gap !== undefined ? `gap: ${mobile.gap}px;` : ''}
          }
        `;
      }
      components.forEach((comp) => {
        const r = ((comp.props?._responsive as Record<string, Record<string, unknown>>) || {}).mobile;
        if (r) {
          const cClass = `grid-comp-${comp.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          css += `
            .${cClass} {
              ${r.gridRowStart !== undefined || r.gridRowEnd !== undefined ? `grid-row: ${r.gridRowStart || (comp.props.gridRowStart as number) || 1} / ${r.gridRowEnd || (comp.props.gridRowEnd as number) || 2};` : ''}
              ${r.gridColumnStart !== undefined || r.gridColumnEnd !== undefined ? `grid-column: ${r.gridColumnStart || (comp.props.gridColumnStart as number) || 1} / ${r.gridColumnEnd || (comp.props.gridColumnEnd as number) || 13};` : ''}
              ${r.visibility === 'hidden' ? 'display: none;' : r.visibility === 'visible' ? 'display: block;' : ''}
            }
          `;
        }
      });
      css += '}';
    }

    return css;
  };

  return (
    <section
      className={`relative ${bgClass}`}
      style={{
        padding: `${padding}px`,
        borderRadius: `${borderRadius}px`,
        ...(backgroundPreset === 'custom' ? { backgroundColor } : {}),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: generateStyles() }} />
      <div className="max-w-7xl mx-auto">
        <div className={sClass}>
          {components.map((component) => {
            const cClass = `grid-comp-${component.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
            return (
              <div key={component.id} className={cClass}>
                <ComponentPublic component={component} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ===== Renderizado público de cada componente =====

export function ComponentPublic({ component }: { component: { id: string; type: string; props: Record<string, unknown> } }) {
  const props = component.props || {};

  switch (component.type) {
    case 'heading':
      return <HeadingPublic props={props} />;
    case 'text':
      return <TextPublic props={props} />;
    case 'image':
      return <ImagePublic props={props} />;
    case 'button':
      return <ButtonPublic props={props} />;
    case 'spacer':
      return <SpacerPublic props={props} />;
    case 'divider':
      return <DividerPublic props={props} />;
    case 'icon':
      return <IconPublic props={props} />;
    case 'card':
      return <CardPublic props={props} />;
    case 'video':
      return <VideoPublic props={props} />;
    case 'gallery':
      return <GalleryPublic props={props} />;
    case 'testimonial':
      return <TestimonialPublic props={props} />;
    case 'stat':
      return <StatPublic props={props} />;
    default:
      return null;
  }
}

// ===== Componentes individuales =====

function HeadingPublic({ props }: { props: Record<string, unknown> }) {
  const Tag = (props.level as keyof JSX.IntrinsicElements) || 'h2';
  const sizeMap: Record<string, string> = {
    h1: 'text-4xl', h2: 'text-3xl', h3: 'text-2xl', h4: 'text-xl', h5: 'text-lg', h6: 'text-base',
  };
  const useAutoColor = props.autoColor === undefined || props.autoColor === true || props.autoColor === 'true';
  const flexH: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const flexV: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

  return React.createElement(Tag as string, {
    className: `font-bold ${sizeMap[Tag as string] || 'text-2xl'} ${useAutoColor ? 'text-foreground' : ''}`,
    style: {
      display: 'flex',
      alignItems: flexV[(props.verticalAlign as string) || 'center'] || 'center',
      justifyContent: flexH[(props.alignment as string) || 'left'] || 'flex-start',
      height: '100%',
      width: '100%',
      ...(!useAutoColor && (props.color as string) ? { color: props.color as string } : {}),
      fontSize: (props.fontSize as number) > 0 ? `${props.fontSize}px` : undefined,
    },
  }, (props.content as string) || 'Titulo');
}

function TextPublic({ props }: { props: Record<string, unknown> }) {
  const useAutoColor = props.autoColor === undefined || props.autoColor === true || props.autoColor === 'true';
  const flexV: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
  const flexH: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end', justify: 'flex-start' };
  const alignment = (props.alignment as string) || 'left';

  return (
    <div style={{
      display: 'flex',
      alignItems: flexV[(props.verticalAlign as string) || 'center'] || 'center',
      justifyContent: flexH[alignment] || 'flex-start',
      height: '100%',
      width: '100%',
    }}>
      <p
        className={useAutoColor ? 'text-muted-foreground' : ''}
        style={{
          textAlign: alignment as React.CSSProperties['textAlign'],
          ...(!useAutoColor && (props.color as string) ? { color: props.color as string } : {}),
          fontSize: `${(props.fontSize as number) || 16}px`,
          whiteSpace: 'pre-wrap',
          width: '100%',
        }}
      >
        {(props.content as string) || 'Tu texto aqui...'}
      </p>
    </div>
  );
}

function ImagePublic({ props }: { props: Record<string, unknown> }) {
  const src = props.src as string;
  const flexH: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const flexV: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

  if (!src) {
    return <div className="w-full h-full bg-muted/20 rounded flex items-center justify-center text-muted-foreground text-sm">Sin imagen</div>;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: flexV[(props.verticalAlign as string) || 'center'] || 'center',
      justifyContent: flexH[(props.alignment as string) || 'center'] || 'center',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }}>
      <img
        src={getUploadUrl(src)}
        alt={(props.alt as string) || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: (props.objectFit as React.CSSProperties['objectFit']) || 'cover',
          borderRadius: `${(props.borderRadius as number) || 0}px`,
        }}
      />
    </div>
  );
}

function ButtonPublic({ props }: { props: Record<string, unknown> }) {
  const router = useRouter();
  const bgColor = (props.bgColor as string) || '#6366f1';
  const variant = (props.variant as string) || 'primary';
  const size = (props.size as string) || 'md';
  const sizeClasses: Record<string, string> = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: bgColor, color: '#fff' },
    secondary: { backgroundColor: `${bgColor}20`, color: bgColor, border: `1px solid ${bgColor}40` },
    outline: { border: `2px solid ${bgColor}`, color: bgColor, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent', color: bgColor },
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = (props.url as string) || '';
    if (!url || url === '#') return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(url);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: (props.verticalAlign as string) === 'top' ? 'flex-start' : (props.verticalAlign as string) === 'bottom' ? 'flex-end' : 'center', alignItems: (props.alignment as string) === 'left' ? 'flex-start' : (props.alignment as string) === 'right' ? 'flex-end' : 'center' }}>
      <a
        href={(props.url as string) || '#'}
        className={`${sizeClasses[size] || sizeClasses.md} inline-block rounded-lg font-semibold cursor-pointer`}
        style={variantStyles[variant] || variantStyles.primary}
        onClick={handleClick}
      >
        {(props.text as string) || 'Boton'}
      </a>
    </div>
  );
}

function SpacerPublic({ props }: { props: Record<string, unknown> }) {
  return <div style={{ height: `${(props.height as number) || 32}px`, width: '100%' }} />;
}

function DividerPublic({ props }: { props: Record<string, unknown> }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div style={{
        width: '100%',
        height: 0,
        borderTop: `${(props.thickness as number) || 1}px ${(props.style as string) || 'solid'} ${(props.color as string) || '#e5e7eb'}`,
      }} />
    </div>
  );
}

function IconPublic({ props }: { props: Record<string, unknown> }) {
  const iconName = (props.iconName as string) || 'Heart';
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>)[iconName]
    || (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>).Heart;
  const flexH: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
  const flexV: Record<string, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };

  return (
    <div style={{
      display: 'flex',
      justifyContent: flexH[(props.alignment as string) || 'center'] || 'center',
      alignItems: flexV[(props.verticalAlign as string) || 'center'] || 'center',
      width: '100%',
      height: '100%',
    }}>
      {IconComp && <IconComp size={(props.size as number) || 48} color={(props.color as string) || '#6366f1'} strokeWidth={2} />}
    </div>
  );
}

function CardPublic({ props }: { props: Record<string, unknown> }) {
  const imageSrc = props.imageSrc as string;
  const textAlign = (props.textAlign as string) || 'left';
  const buttonColor = (props.buttonColor as string) || '#6366f1';

  return (
    <div style={{
      backgroundColor: (props.bgColor as string) || '#ffffff',
      borderRadius: `${(props.borderRadius as number) || 8}px`,
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #e5e7eb',
    }}>
      {imageSrc && (
        <img
          src={getUploadUrl(imageSrc)}
          alt={(props.title as string) || ''}
          style={{ width: '100%', height: `${(props.imageHeight as number) || 200}px`, objectFit: 'cover' }}
        />
      )}
      <div style={{ padding: `${(props.padding as number) || 16}px`, flex: 1, textAlign: textAlign as React.CSSProperties['textAlign'] }}>
        <h3
          className={`${(props.titleSize as string) || 'text-lg'} font-semibold`}
          style={{ color: (props.titleColor as string) || '#000000', marginBottom: '8px' }}
        >
          {(props.title as string) || 'Titulo'}
        </h3>
        <p
          className={(props.descriptionSize as string) || 'text-sm'}
          style={{
            color: (props.descriptionColor as string) || '#666666',
            marginBottom: (props.buttonText as string) ? '16px' : '0',
            whiteSpace: 'pre-wrap',
          }}
        >
          {(props.description as string) || 'Descripcion'}
        </p>
        {(props.buttonText as string) && (
          <a
            href={(props.buttonUrl as string) || '#'}
            style={{
              backgroundColor: buttonColor,
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              display: 'inline-block',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            {props.buttonText as string}
          </a>
        )}
      </div>
    </div>
  );
}

function VideoPublic({ props }: { props: Record<string, unknown> }) {
  const url = (props.url as string) || '';
  const borderRadius = (props.borderRadius as number) || 8;
  const autoplay = props.autoplay === true || props.autoplay === 'true';

  if (!url) return null;

  const getEmbedUrl = (videoUrl: string): string => {
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=${autoplay ? '1' : '0'}`;
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${autoplay ? '1' : '0'}`;
    return videoUrl;
  };

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: `${borderRadius}px`, overflow: 'hidden' }}>
      <iframe
        src={getEmbedUrl(url)}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function GalleryPublic({ props }: { props: Record<string, unknown> }) {
  const url = (props.imageUrl as string) || '';
  if (!url) return null;

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: `${(props.borderRadius as number) || 8}px` }}>
      <img
        src={getUploadUrl(url)}
        alt={(props.alt as string) || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: (props.objectFit as React.CSSProperties['objectFit']) || 'cover',
        }}
      />
    </div>
  );
}

function TestimonialPublic({ props }: { props: Record<string, unknown> }) {
  const isHorizontal = (props.layout as string) === 'horizontal';
  const textAlign = (props.textAlign as string) || 'center';
  const showQuoteIcon = props.showQuoteIcon === true || props.showQuoteIcon === 'true';
  const photoUrl = props.photoUrl as string;
  const QuoteIcon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>>).Quote;

  return (
    <div style={{
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
    }}>
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
      <div style={{ flex: 1 }}>
        {showQuoteIcon && QuoteIcon && (
          <QuoteIcon size={32} style={{ color: (props.quoteIconColor as string) || '#6366f1', opacity: 0.2, marginBottom: '8px' }} />
        )}
        <p style={{ color: (props.quoteColor as string) || '#1a1a1a', fontSize: '16px', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '16px' }}>
          &ldquo;{(props.quote as string) || 'Testimonio de ejemplo'}&rdquo;
        </p>
        <p style={{ color: (props.nameColor as string) || '#1a1a1a', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
          {(props.name as string) || 'Nombre del Cliente'}
        </p>
        <p style={{ color: (props.positionColor as string) || '#666666', fontSize: '14px' }}>
          {(props.position as string) || 'Cargo'}{(props.company as string) ? `, ${props.company}` : ''}
        </p>
      </div>
    </div>
  );
}

function StatPublic({ props }: { props: Record<string, unknown> }) {
  const isHorizontal = (props.layout as string) === 'horizontal';
  const showIcon = props.showIcon === true || props.showIcon === 'true';
  const iconName = (props.iconName as string) || 'TrendingUp';
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>>)[iconName]
    || (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties; strokeWidth?: number }>>).TrendingUp;

  return (
    <div style={{
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
    }}>
      {showIcon && IconComp && (
        <IconComp size={parseInt(String(props.iconSize)) || 40} style={{ color: (props.iconColor as string) || '#6366f1' }} strokeWidth={2} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{ color: (props.valueColor as string) || '#1a1a1a', fontSize: `${(props.valueSize as number) || 48}px`, fontWeight: 700, lineHeight: 1 }}>
          {(props.value as string) || '500+'}
        </div>
        <div style={{ color: (props.labelColor as string) || '#666666', fontSize: '14px', fontWeight: 500 }}>
          {(props.label as string) || 'Clientes Felices'}
        </div>
      </div>
    </div>
  );
}
