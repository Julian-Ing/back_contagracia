'use client';

/**
 * FlexSection - Renderiza secciones tipo 'flex-container' del Page Builder
 * en la vista pública. Flexbox con componentes y media queries responsive.
 */

import React from 'react';
import type { SiteSection } from '@/modules/admin/types/cms.types';
import { ComponentPublic } from './ContainerSection';

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

interface FlexSectionProps {
  section: SiteSection;
}

export function FlexSection({ section }: FlexSectionProps) {
  const content = section.content || {};
  const sectionId = section.id.replace(/[^a-zA-Z0-9_-]/g, '');

  const backgroundPreset = (content.backgroundPreset as string) || 'white';
  const backgroundColor = (content.backgroundColor as string) || '#ffffff';
  const borderRadius = (content.borderRadius as number) || 0;

  // Desktop (base) values
  const direction = (content.direction as string) || 'row';
  const wrap = (content.wrap as string) || 'wrap';
  const justifyContent = (content.justifyContent as string) || 'flex-start';
  const alignItems = (content.alignItems as string) || 'stretch';
  const gap = (content.gap as number) ?? 16;
  const padding = (content.padding as number) ?? 24;

  const bgClass = COLOR_PRESET_CLASSES[backgroundPreset] || '';
  const components = (content.components as Array<{ id: string; type: string; props: Record<string, unknown> }>) || [];
  const responsive = (content._responsive as Record<string, Record<string, unknown>>) || {};

  // Generate scoped CSS with media queries
  const generateStyles = () => {
    const sClass = `flex-section-${sectionId}`;
    let css = `
      .${sClass} {
        display: flex;
        flex-direction: ${direction};
        flex-wrap: ${wrap};
        justify-content: ${justifyContent};
        align-items: ${alignItems};
        gap: ${gap}px;
        padding: ${padding}px;
        border-radius: ${borderRadius}px;
      }
    `;

    // Component styles (base)
    components.forEach((comp) => {
      const p = comp.props || {};
      const cClass = `flex-comp-${comp.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      css += `
        .${cClass} {
          flex-basis: ${(p.flexBasis as string) || 'auto'};
          flex-grow: ${(p.flexGrow as number) ?? 0};
          ${p.visibility === 'hidden' ? 'display: none;' : ''}
        }
      `;
    });

    // Tablet
    const tablet = responsive.tablet || {};
    if (Object.keys(tablet).length > 0) {
      css += `@media (max-width: 1024px) {
        .${sClass} {
          ${tablet.direction ? `flex-direction: ${tablet.direction};` : ''}
          ${tablet.justifyContent ? `justify-content: ${tablet.justifyContent};` : ''}
          ${tablet.alignItems ? `align-items: ${tablet.alignItems};` : ''}
          ${tablet.gap !== undefined ? `gap: ${tablet.gap}px;` : ''}
          ${tablet.padding !== undefined ? `padding: ${tablet.padding}px;` : ''}
        }
      `;
      components.forEach((comp) => {
        const r = ((comp.props?._responsive as Record<string, Record<string, unknown>>) || {}).tablet;
        if (r) {
          const cClass = `flex-comp-${comp.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          css += `
            .${cClass} {
              ${r.flexBasis !== undefined ? `flex-basis: ${r.flexBasis};` : ''}
              ${r.flexGrow !== undefined ? `flex-grow: ${r.flexGrow};` : ''}

              ${r.visibility === 'hidden' ? 'display: none;' : r.visibility === 'visible' ? 'display: block;' : ''}
            }
          `;
        }
      });
      css += '}';
    }

    // Mobile
    const mobile = responsive.mobile || {};
    if (Object.keys(mobile).length > 0) {
      css += `@media (max-width: 768px) {
        .${sClass} {
          ${mobile.direction ? `flex-direction: ${mobile.direction};` : ''}
          ${mobile.justifyContent ? `justify-content: ${mobile.justifyContent};` : ''}
          ${mobile.alignItems ? `align-items: ${mobile.alignItems};` : ''}
          ${mobile.gap !== undefined ? `gap: ${mobile.gap}px;` : ''}
          ${mobile.padding !== undefined ? `padding: ${mobile.padding}px;` : ''}
        }
      `;
      components.forEach((comp) => {
        const r = ((comp.props?._responsive as Record<string, Record<string, unknown>>) || {}).mobile;
        if (r) {
          const cClass = `flex-comp-${comp.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          css += `
            .${cClass} {
              ${r.flexBasis !== undefined ? `flex-basis: ${r.flexBasis};` : ''}
              ${r.flexGrow !== undefined ? `flex-grow: ${r.flexGrow};` : ''}

              ${r.visibility === 'hidden' ? 'display: none;' : r.visibility === 'visible' ? 'display: block;' : ''}
            }
          `;
        }
      });
      css += '}';
    }

    return css;
  };

  const sClass = `flex-section-${sectionId}`;

  return (
    <section
      className={`relative ${bgClass}`}
      style={backgroundPreset === 'custom' ? { backgroundColor } : undefined}
    >
      <style dangerouslySetInnerHTML={{ __html: generateStyles() }} />
      <div className="max-w-7xl mx-auto">
        <div className={sClass}>
          {components.map((component) => {
            const cClass = `flex-comp-${component.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
