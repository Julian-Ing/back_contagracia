'use client';

/**
 * PageBuilder - Layout principal del builder (3 paneles)
 * Integra BuilderContext, @dnd-kit, Canvas, Sidebar, Library, Toolbar
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useBuilder, type BuilderSection } from './BuilderContext';
import { BuilderToolbar } from './BuilderToolbar';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderSidebar } from './BuilderSidebar';
import { BuilderLibrary } from './BuilderLibrary';
import { BuilderPreviewModal } from './preview/BuilderPreviewModal';
import { CellSelector } from './components/CellSelector';
import { getBlockDefaults } from './BlockRegistry';
import { getComponentDefaults, getComponentByType, FLEX_POSITION_PROPS } from './ComponentRegistry';
import { cmsService } from '@/modules/admin/services/cms.service';
import type { ContainerContent, SectionType } from '@/modules/admin/types/cms.types';

interface PageBuilderProps {
  pageId: string;
  pageTitle: string;
}

export function PageBuilder({ pageId, pageTitle }: PageBuilderProps) {
  const {
    state, addSection, addComponent, setSaving, markSaved, setSections,
  } = useBuilder();

  const [showPreview, setShowPreview] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: string; label: string } | null>(null);

  // Cell selector state
  const [cellSelectorOpen, setCellSelectorOpen] = useState(false);
  const [pendingComponent, setPendingComponent] = useState<{
    componentType: string;
    sectionId: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ===== DND HANDLERS =====

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'block') {
      setDraggedItem({ type: 'block', label: 'Grid Container' });
    } else if (data?.type === 'component') {
      const comp = getComponentByType(data.componentType);
      setDraggedItem({ type: 'component', label: comp?.label || data.componentType });
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggedItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overId = String(over.id);

    if (activeData?.type === 'block' && (overId === 'canvas-drop' || overId.startsWith('section-'))) {
      // Dropped a block -> create new section
      const blockType = activeData.blockType as SectionType;
      const defaults = getBlockDefaults(blockType);
      const newSection: BuilderSection = {
        id: `temp_${Date.now()}`,
        page_id: pageId,
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
    } else if (activeData?.type === 'component' && overId.startsWith('section-')) {
      const sectionId = overId.replace('section-', '');
      const targetSection = state.sections.find(s => s.id === sectionId);

      if (targetSection?.section_type === 'flex-container') {
        // Flex container: add component directly (no cell selector)
        const defaults = getComponentDefaults(activeData.componentType);
        const flexDefaults: Record<string, unknown> = {};
        FLEX_POSITION_PROPS.forEach(p => { if (p.default !== undefined) flexDefaults[p.key] = p.default; });
        const component = {
          id: `comp_${Date.now()}`,
          type: activeData.componentType as string,
          props: { ...defaults, ...flexDefaults },
        };
        addComponent(sectionId, component);
      } else {
        // Grid container: open cell selector
        setPendingComponent({ componentType: activeData.componentType, sectionId });
        setCellSelectorOpen(true);
      }
    }
  }, [pageId, state.sections, addSection, addComponent]);

  // ===== CELL SELECTOR HANDLER =====

  const handleCellSelect = useCallback((selection: { rowStart: number; rowEnd: number; colStart: number; colEnd: number }) => {
    if (!pendingComponent) return;

    const defaults = getComponentDefaults(pendingComponent.componentType);
    const component = {
      id: `comp_${Date.now()}`,
      type: pendingComponent.componentType,
      props: {
        ...defaults,
        gridRowStart: selection.rowStart + 1,
        gridRowEnd: selection.rowEnd + 1,
        gridColumnStart: selection.colStart + 1,
        gridColumnEnd: selection.colEnd + 1,
      },
    };
    addComponent(pendingComponent.sectionId, component);
    setCellSelectorOpen(false);
    setPendingComponent(null);
  }, [pendingComponent, addComponent]);

  // ===== SAVE =====

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Eliminar secciones borradas del servidor
      for (const deletedId of state.deletedSectionIds) {
        await cmsService.deleteSection(deletedId);
      }

      for (const section of state.sections) {
        const content: ContainerContent = {
          ...((section.content || {}) as ContainerContent),
          components: (section.components || []).map(c => ({
            id: c.id,
            type: c.type,
            props: c.props,
          })),
        };

        if (section.id.startsWith('temp_')) {
          // Create new section
          await cmsService.createSection(pageId, {
            section_key: section.section_key,
            section_type: section.section_type,
            title: section.title || undefined,
            subtitle: section.subtitle || undefined,
            content,
            is_active: true,
            display_order: section.display_order,
          });
        } else {
          // Update existing
          await cmsService.updateSection(section.id, {
            title: section.title || undefined,
            subtitle: section.subtitle || undefined,
            content,
            display_order: section.display_order,
          });
        }
      }
      // Recargar secciones desde la API para sincronizar IDs reales
      const freshSections = await cmsService.getSections(pageId);
      const builderSections: BuilderSection[] = freshSections.map((s) => {
        const cnt = (s.content || {}) as ContainerContent;
        return { ...s, components: cnt.components || [] };
      });
      setSections(builderSections);
      markSaved();
    } catch (err) {
      console.error('Error guardando:', err);
    } finally {
      setSaving(false);
    }
  }, [state.sections, state.deletedSectionIds, pageId, setSaving, markSaved, setSections]);

  // Get grid dimensions and occupied cells for cell selector
  const pendingSection = pendingComponent
    ? state.sections.find(s => s.id === pendingComponent.sectionId)
    : null;
  const pendingSectionContent = pendingSection
    ? (pendingSection.content || {}) as ContainerContent
    : null;
  const occupiedCells = React.useMemo(() => {
    if (!pendingSection) return [];
    const cells: { row: number; col: number }[] = [];
    for (const comp of pendingSection.components || []) {
      const p = comp.props || {};
      const rStart = ((p.gridRowStart as number) || 1) - 1;
      const rEnd = ((p.gridRowEnd as number) || 2) - 1;
      const cStart = ((p.gridColumnStart as number) || 1) - 1;
      const cEnd = ((p.gridColumnEnd as number) || 2) - 1;
      for (let r = rStart; r < rEnd; r++) {
        for (let c = cStart; c < cEnd; c++) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  }, [pendingSection]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
        <BuilderToolbar
          pageTitle={pageTitle}
          onSave={handleSave}
          onPreview={() => setShowPreview(true)}
        />

        <div className="flex flex-1 overflow-hidden">
          <BuilderSidebar />
          <BuilderCanvas />
          <BuilderLibrary />
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedItem && (
          <div className="px-3 py-2 bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-xl">
            {draggedItem.label}
          </div>
        )}
      </DragOverlay>

      {/* Cell Selector Modal */}
      <CellSelector
        open={cellSelectorOpen}
        onClose={() => { setCellSelectorOpen(false); setPendingComponent(null); }}
        onSelect={handleCellSelect}
        rows={pendingSectionContent?.gridRows || 3}
        cols={pendingSectionContent?.gridColumns || 12}
        componentLabel={
          pendingComponent
            ? getComponentByType(pendingComponent.componentType)?.label || ''
            : ''
        }
        occupiedCells={occupiedCells}
      />

      {/* Preview Modal */}
      <BuilderPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        pageTitle={pageTitle}
      />
    </DndContext>
  );
}
