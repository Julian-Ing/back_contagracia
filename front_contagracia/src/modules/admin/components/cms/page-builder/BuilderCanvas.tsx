'use client';

/**
 * BuilderCanvas - Canvas central con grid visual
 * Renderiza secciones con grid CSS tipo Excel, componentes posicionados en celdas
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Trash2, ChevronUp, ChevronDown, Copy, Grid3X3, Rows3 } from 'lucide-react';
import { useBuilder, type BuilderSection } from './BuilderContext';
import { ComponentRenderer } from './components/ComponentRenderer';
import { getBlockDefaults } from './BlockRegistry';
import { resolveContent, resolveProps } from '@/modules/admin/utils/responsive.utils';
import type { ContainerContent } from '@/modules/admin/types/cms.types';

const VIEWPORT_WIDTHS: Record<string, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function BuilderCanvas() {
  const { state, addSection, selectSection, selectComponent, deleteSection, duplicateSection, moveSection } = useBuilder();
  const viewportWidth = VIEWPORT_WIDTHS[state.viewportMode];
  const { setNodeRef } = useDroppable({ id: 'canvas-drop' });

  const handleAddSection = (blockType: 'container' | 'flex-container') => {
    const defaults = getBlockDefaults(blockType);
    const newSection: BuilderSection = {
      id: `temp_${Date.now()}`,
      page_id: '',
      section_key: `${blockType}_${Date.now()}`,
      section_type: blockType,
      title: '',
      subtitle: '',
      content: { ...defaults, components: [] } as unknown as Record<string, unknown>,
      display_order: state.sections.length + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      components: [],
    };
    addSection(newSection);
  };

  return (
    <div ref={setNodeRef} className="flex-1 overflow-auto bg-gray-100 dark:bg-slate-900 p-6">
      <div
        className="mx-auto transition-all duration-300"
        style={{ maxWidth: viewportWidth }}
      >
        {state.sections.length === 0 ? (
          <EmptyCanvas onAdd={(type) => handleAddSection(type)} />
        ) : (
          <div className="space-y-4">
            {state.sections.map((section) => {
              const content = (section.content || {}) as ContainerContent;
              const isSelected = state.selectedSectionId === section.id;

              const CanvasComponent = section.section_type === 'flex-container' ? FlexCanvas : GridCanvas;

              return (
                <SectionWrapper
                  key={section.id}
                  sectionId={section.id}
                  isSelected={isSelected}
                  title={section.title || section.section_key}
                  onSelect={() => selectSection(section.id)}
                  onDelete={() => deleteSection(section.id)}
                  onDuplicate={() => duplicateSection(section.id)}
                  onMoveUp={() => moveSection(section.id, 'up')}
                  onMoveDown={() => moveSection(section.id, 'down')}
                >
                  <CanvasComponent
                    sectionId={section.id}
                    content={content}
                    components={section.components || []}
                    selectedComponentId={
                      state.selectedComponent?.sectionId === section.id
                        ? state.selectedComponent.componentId
                        : null
                    }
                    onSelectComponent={(componentId) =>
                      selectComponent({ sectionId: section.id, componentId })
                    }
                  />
                </SectionWrapper>
              );
            })}

            {/* Add section buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleAddSection('container')}
                className="flex-1 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="text-sm">+ Grid</span>
              </button>
              <button
                onClick={() => handleAddSection('flex-container')}
                className="flex-1 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
              >
                <Rows3 className="w-4 h-4" />
                <span className="text-sm">+ Flex</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCanvas({ onAdd }: { onAdd: (type: 'container' | 'flex-container') => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
        Canvas vacío
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">
        Selecciona un tipo de sección o arrastra un bloque desde la biblioteca para comenzar.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => onAdd('container')}
          className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer group"
        >
          <Grid3X3 className="w-8 h-8 text-gray-400 group-hover:text-indigo-500" />
          <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-600">Grid</span>
        </button>
        <button
          onClick={() => onAdd('flex-container')}
          className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all cursor-pointer group"
        >
          <Rows3 className="w-8 h-8 text-gray-400 group-hover:text-purple-500" />
          <span className="text-sm font-medium text-gray-500 group-hover:text-purple-600">Flex</span>
        </button>
      </div>
    </div>
  );
}

interface SectionWrapperProps {
  children: React.ReactNode;
  sectionId: string;
  isSelected: boolean;
  title: string;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SectionWrapper({
  children, sectionId, isSelected, title,
  onSelect, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: SectionWrapperProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `section-${sectionId}` });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-lg transition-all ${
        isSelected
          ? 'ring-2 ring-indigo-500 shadow-lg'
          : isOver
          ? 'ring-2 ring-green-400 shadow-md'
          : 'ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-indigo-300'
      } bg-white dark:bg-slate-800`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-slate-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
          {title}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" title="Subir">
            <ChevronUp className="w-3 h-3 text-gray-400" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" title="Bajar">
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" title="Duplicar">
            <Copy className="w-3 h-3 text-gray-400" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Eliminar">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        {children}
      </div>
    </div>
  );
}

interface GridCanvasProps {
  sectionId: string;
  content: ContainerContent;
  components: Array<{ id: string; type: string; props: Record<string, unknown> }>;
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

function GridCanvas({ sectionId, content, components, selectedComponentId, onSelectComponent }: GridCanvasProps) {
  const { state } = useBuilder();
  const resolved = resolveContent(content as unknown as Record<string, unknown>, state.viewportMode);
  const rows = (resolved.gridRows as number) || 3;
  const cols = (resolved.gridColumns as number) || 12;
  const gap = (resolved.gap as number) ?? 16;
  const padding = (resolved.padding as number) ?? 24;
  const cellHeight = (resolved.cellHeight as number) || 100;
  const showLines = content.showGridLines !== false;

  return (
    <div
      className="relative"
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: `${gap}px`,
        padding: `${padding}px`,
        borderRadius: `${content.borderRadius || 0}px`,
        minHeight: rows * cellHeight + (rows - 1) * gap + padding * 2,
      }}
    >
      {/* Grid lines overlay */}
      {showLines && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            display: 'grid',
            gridTemplateRows: `repeat(${rows}, ${cellHeight}px)`,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: `${gap}px`,
            padding: `${padding}px`,
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => (
            <div
              key={i}
              className="border border-dashed border-gray-200 dark:border-slate-700 rounded-sm"
            />
          ))}
        </div>
      )}

      {/* Components */}
      {components.map((comp) => (
        <ComponentRenderer
          key={comp.id}
          component={comp}
          sectionId={sectionId}
          isSelected={selectedComponentId === comp.id}
          onClick={() => onSelectComponent(comp.id)}
        />
      ))}
    </div>
  );
}

interface FlexCanvasProps {
  sectionId: string;
  content: ContainerContent;
  components: Array<{ id: string; type: string; props: Record<string, unknown> }>;
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

function FlexCanvas({ sectionId, content, components, selectedComponentId, onSelectComponent }: FlexCanvasProps) {
  const { state } = useBuilder();
  const resolved = resolveContent(content as unknown as Record<string, unknown>, state.viewportMode);

  const direction = (resolved.direction as string) || 'row';
  const wrap = (resolved.wrap as string) || 'wrap';
  const justifyContent = (resolved.justifyContent as string) || 'flex-start';
  const alignItems = (resolved.alignItems as string) || 'stretch';
  const gap = (resolved.gap as number) ?? 16;
  const padding = (resolved.padding as number) ?? 24;

  return (
    <div
      className="relative"
      style={{
        display: 'flex',
        flexDirection: direction as React.CSSProperties['flexDirection'],
        flexWrap: wrap as React.CSSProperties['flexWrap'],
        justifyContent,
        alignItems,
        gap: `${gap}px`,
        padding: `${padding}px`,
        borderRadius: `${(content as unknown as Record<string, unknown>).borderRadius || 0}px`,
        minHeight: 120,
      }}
    >
      {components.length === 0 && (
        <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center py-8 text-gray-400 text-sm">
          Arrastra componentes aquí
        </div>
      )}

      {components.map((comp, index) => {
        const resolvedCompProps = resolveProps(comp.props, state.viewportMode);
        const flexItemStyle: React.CSSProperties = {
          flexBasis: (resolvedCompProps.flexBasis as string) || 'auto',
          flexGrow: Number(resolvedCompProps.flexGrow) || 0,
        };

        return (
          <div key={comp.id} style={flexItemStyle}>
            <ComponentRenderer
              component={comp}
              sectionId={sectionId}
              isSelected={selectedComponentId === comp.id}
              onClick={() => onSelectComponent(comp.id)}
              flexMode
              flexIndex={index}
              flexTotal={components.length}
            />
          </div>
        );
      })}
    </div>
  );
}
