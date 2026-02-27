/**
 * BlockRegistry - Registro de tipos de bloque (secciones) del Page Builder
 * Cada bloque es una sección con grid o flex configurable
 */

import { Grid, Rows } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface BlockProperty {
  key: string;
  label: string;
  type: 'number' | 'select' | 'boolean' | 'color' | 'text';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  responsive?: boolean;
}

export interface BlockDefinition {
  type: string;
  label: string;
  icon: LucideIcon;
  description: string;
  category: string;
  properties: BlockProperty[];
}

export interface BlockCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  order: number;
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  { id: 'layout', label: 'Secciones', icon: Grid, order: 1 },
];

const BACKGROUND_PRESETS = [
  { value: 'white', label: 'Blanco' },
  { value: 'light-gray', label: 'Gris claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'slate', label: 'Slate' },
  { value: 'gradient-blue', label: 'Degradado Azul' },
  { value: 'gradient-purple', label: 'Degradado Púrpura' },
  { value: 'gradient-green', label: 'Degradado Verde' },
  { value: 'gradient-orange', label: 'Degradado Naranja' },
  { value: 'gradient-pink', label: 'Degradado Rosa' },
  { value: 'gradient-dark', label: 'Degradado Oscuro' },
  { value: 'custom', label: 'Color personalizado' },
];

export const BLOCKS: BlockDefinition[] = [
  {
    type: 'container',
    label: 'Grid Container',
    icon: Grid,
    description: 'Contenedor tipo Excel - Coloca componentes en celdas específicas',
    category: 'layout',
    properties: [
      { key: 'gridRows', label: 'Filas', type: 'number', default: 3, min: 1, max: 20, step: 1, responsive: true },
      { key: 'gridColumns', label: 'Columnas', type: 'number', default: 12, min: 1, max: 12, step: 1, responsive: true },
      { key: 'cellHeight', label: 'Altura de celda (px)', type: 'number', default: 100, min: 40, max: 400, step: 10, responsive: true },
      { key: 'gap', label: 'Espaciado (px)', type: 'number', default: 16, min: 0, max: 48, step: 4, responsive: true },
      { key: 'padding', label: 'Padding (px)', type: 'number', default: 24, min: 0, max: 64, step: 4, responsive: true },
      { key: 'backgroundPreset', label: 'Fondo', type: 'select', default: 'white', options: BACKGROUND_PRESETS },
      { key: 'backgroundColor', label: 'Color de fondo', type: 'color', default: '' },
      { key: 'borderRadius', label: 'Bordes redondeados (px)', type: 'number', default: 8, min: 0, max: 32, step: 2 },
      { key: 'showGridLines', label: 'Mostrar líneas de grid', type: 'boolean', default: true },
    ],
  },
  {
    type: 'flex-container',
    label: 'Flex Container',
    icon: Rows,
    description: 'Contenedor flexible - Componentes apilados horizontal o verticalmente',
    category: 'layout',
    properties: [
      { key: 'direction', label: 'Dirección', type: 'select', default: 'row', responsive: true, options: [
        { value: 'row', label: 'Horizontal' }, { value: 'column', label: 'Vertical' },
        { value: 'row-reverse', label: 'Horizontal inverso' }, { value: 'column-reverse', label: 'Vertical inverso' },
      ]},
      { key: 'wrap', label: 'Wrap', type: 'select', default: 'wrap', options: [
        { value: 'nowrap', label: 'Sin wrap' }, { value: 'wrap', label: 'Con wrap' },
      ]},
      { key: 'justifyContent', label: 'Justificación', type: 'select', default: 'flex-start', responsive: true, options: [
        { value: 'flex-start', label: 'Inicio' }, { value: 'center', label: 'Centro' },
        { value: 'flex-end', label: 'Final' }, { value: 'space-between', label: 'Space Between' },
        { value: 'space-around', label: 'Space Around' }, { value: 'space-evenly', label: 'Space Evenly' },
      ]},
      { key: 'alignItems', label: 'Alineación', type: 'select', default: 'stretch', responsive: true, options: [
        { value: 'flex-start', label: 'Inicio' }, { value: 'center', label: 'Centro' },
        { value: 'flex-end', label: 'Final' }, { value: 'stretch', label: 'Estirar' },
      ]},
      { key: 'gap', label: 'Espaciado (px)', type: 'number', default: 16, min: 0, max: 48, step: 4, responsive: true },
      { key: 'padding', label: 'Padding (px)', type: 'number', default: 24, min: 0, max: 64, step: 4, responsive: true },
      { key: 'minHeight', label: 'Altura mínima (px)', type: 'number', default: 200, min: 100, max: 800, step: 50 },
      { key: 'backgroundPreset', label: 'Fondo', type: 'select', default: 'white', options: BACKGROUND_PRESETS },
      { key: 'backgroundColor', label: 'Color de fondo', type: 'color', default: '' },
      { key: 'borderRadius', label: 'Bordes redondeados (px)', type: 'number', default: 8, min: 0, max: 32, step: 2 },
    ],
  },
];

export function getBlocksByCategory(): Record<string, BlockDefinition[]> {
  const result: Record<string, BlockDefinition[]> = {};
  for (const cat of BLOCK_CATEGORIES) {
    result[cat.id] = BLOCKS.filter(b => b.category === cat.id);
  }
  return result;
}

export function getBlockByType(type: string): BlockDefinition | undefined {
  return BLOCKS.find(b => b.type === type);
}

export function getBlockDefaults(type: string): Record<string, unknown> {
  const block = getBlockByType(type);
  if (!block) return {};
  const defaults: Record<string, unknown> = {};
  for (const prop of block.properties) {
    defaults[prop.key] = prop.default;
  }
  return defaults;
}

export function searchBlocks(query: string): BlockDefinition[] {
  const q = query.toLowerCase();
  return BLOCKS.filter(
    b => b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
  );
}
