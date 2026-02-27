'use client';

/**
 * BuilderContext - Estado global del Page Builder
 * useReducer con undo/redo, gestión de secciones y componentes
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { SiteSection, ContainerComponent, ContainerContent } from '@/modules/admin/types/cms.types';
import {
  resolveProps as resolvePropsUtil,
  resolveContent as resolveContentUtil,
  setResponsiveProp,
  setResponsiveContent,
  clearResponsiveOverride as clearOverrideUtil,
  hasResponsiveOverride as hasOverrideUtil,
  copyDesktopToViewport as copyDesktopUtil,
} from '@/modules/admin/utils/responsive.utils';

// ===== TYPES =====

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface BuilderSection extends SiteSection {
  components?: ContainerComponent[];
}

export interface SelectedComponent {
  sectionId: string;
  componentId: string;
}

interface BuilderState {
  pageId: string;
  sections: BuilderSection[];
  deletedSectionIds: string[];
  selectedSectionId: string | null;
  selectedComponent: SelectedComponent | null;
  viewportMode: ViewportMode;
  isDirty: boolean;
  isSaving: boolean;
  history: BuilderSection[][];
  historyIndex: number;
}

// ===== ACTIONS =====

type BuilderAction =
  | { type: 'SET_SECTIONS'; payload: BuilderSection[] }
  | { type: 'ADD_SECTION'; payload: { section: BuilderSection; index?: number } }
  | { type: 'UPDATE_SECTION'; payload: { sectionId: string; updates: Partial<BuilderSection> } }
  | { type: 'DELETE_SECTION'; payload: string }
  | { type: 'DUPLICATE_SECTION'; payload: string }
  | { type: 'REORDER_SECTIONS'; payload: BuilderSection[] }
  | { type: 'MOVE_SECTION'; payload: { sectionId: string; direction: 'up' | 'down' } }
  | { type: 'SELECT_SECTION'; payload: string | null }
  | { type: 'ADD_COMPONENT'; payload: { sectionId: string; component: ContainerComponent; index?: number } }
  | { type: 'UPDATE_COMPONENT'; payload: { sectionId: string; componentId: string; updates: Partial<ContainerComponent> } }
  | { type: 'DELETE_COMPONENT'; payload: { sectionId: string; componentId: string } }
  | { type: 'DUPLICATE_COMPONENT'; payload: { sectionId: string; componentId: string } }
  | { type: 'REORDER_COMPONENTS'; payload: { sectionId: string; components: ContainerComponent[] } }
  | { type: 'SELECT_COMPONENT'; payload: SelectedComponent | null }
  | { type: 'UPDATE_SECTION_LAYOUT'; payload: { sectionId: string; layout: Partial<ContainerContent> } }
  | { type: 'SET_VIEWPORT'; payload: ViewportMode }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'MARK_SAVED' }
  | { type: 'DISCARD_CHANGES'; payload: BuilderSection[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const MAX_HISTORY = 30;

function pushHistory(state: BuilderState, newSections: BuilderSection[]): Partial<BuilderState> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newSections);
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
    return { history: newHistory, historyIndex: newHistory.length - 1 };
  }
  return { history: newHistory, historyIndex: state.historyIndex + 1 };
}

function reorderDisplayOrder(sections: BuilderSection[]): BuilderSection[] {
  return sections.map((s, i) => ({ ...s, display_order: i + 1 }));
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_SECTIONS': {
      return {
        ...state,
        sections: action.payload,
        deletedSectionIds: [],
        history: [action.payload],
        historyIndex: 0,
        isDirty: false,
      };
    }

    case 'ADD_SECTION': {
      const { section, index } = action.payload;
      let newSections: BuilderSection[];
      if (index !== undefined && index >= 0) {
        newSections = [...state.sections];
        newSections.splice(index, 0, section);
      } else {
        newSections = [...state.sections, section];
      }
      newSections = reorderDisplayOrder(newSections);
      return {
        ...state,
        sections: newSections,
        selectedSectionId: section.id,
        selectedComponent: null,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'UPDATE_SECTION': {
      const { sectionId, updates } = action.payload;
      const newSections = state.sections.map(s =>
        s.id === sectionId ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
      );
      return {
        ...state,
        sections: newSections,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'DELETE_SECTION': {
      const deletedId = action.payload;
      const newSections = reorderDisplayOrder(
        state.sections.filter(s => s.id !== deletedId)
      );
      // Solo rastrear si no es temp (ya existe en el servidor)
      const newDeleted = !deletedId.startsWith('temp_')
        ? [...state.deletedSectionIds, deletedId]
        : state.deletedSectionIds;
      return {
        ...state,
        sections: newSections,
        deletedSectionIds: newDeleted,
        selectedSectionId: state.selectedSectionId === deletedId ? null : state.selectedSectionId,
        selectedComponent: state.selectedComponent?.sectionId === deletedId ? null : state.selectedComponent,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'DUPLICATE_SECTION': {
      const original = state.sections.find(s => s.id === action.payload);
      if (!original) return state;
      const duplicated: BuilderSection = {
        ...original,
        id: `temp_${Date.now()}`,
        section_key: `${original.section_key}_copy`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const idx = state.sections.findIndex(s => s.id === action.payload);
      const newSections = [...state.sections];
      newSections.splice(idx + 1, 0, duplicated);
      const reordered = reorderDisplayOrder(newSections);
      return {
        ...state,
        sections: reordered,
        selectedSectionId: duplicated.id,
        isDirty: true,
        ...pushHistory(state, reordered),
      };
    }

    case 'REORDER_SECTIONS': {
      const newSections = reorderDisplayOrder(action.payload);
      return {
        ...state,
        sections: newSections,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'MOVE_SECTION': {
      const { sectionId, direction } = action.payload;
      const idx = state.sections.findIndex(s => s.id === sectionId);
      if (direction === 'up' && idx <= 0) return state;
      if (direction === 'down' && idx >= state.sections.length - 1) return state;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const newSections = [...state.sections];
      [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];
      const reordered = reorderDisplayOrder(newSections);
      return {
        ...state,
        sections: reordered,
        isDirty: true,
        ...pushHistory(state, reordered),
      };
    }

    case 'SELECT_SECTION':
      return {
        ...state,
        selectedSectionId: action.payload,
        selectedComponent: action.payload ? null : state.selectedComponent,
      };

    case 'ADD_COMPONENT': {
      const { sectionId, component, index } = action.payload;
      const newSections = state.sections.map(s => {
        if (s.id !== sectionId) return s;
        const comps = s.components || [];
        let newComps: ContainerComponent[];
        if (index !== undefined && index >= 0 && index < comps.length) {
          newComps = [...comps];
          newComps.splice(index, 0, component);
        } else {
          newComps = [...comps, component];
        }
        return { ...s, components: newComps, updated_at: new Date().toISOString() };
      });
      return {
        ...state,
        sections: newSections,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'UPDATE_COMPONENT': {
      const { sectionId, componentId, updates } = action.payload;
      const newSections = state.sections.map(s => {
        if (s.id !== sectionId) return s;
        const comps = (s.components || []).map(c =>
          c.id === componentId ? { ...c, ...updates } : c
        );
        return { ...s, components: comps, updated_at: new Date().toISOString() };
      });
      return {
        ...state,
        sections: newSections,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'DELETE_COMPONENT': {
      const { sectionId, componentId } = action.payload;
      const newSections = state.sections.map(s => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          components: (s.components || []).filter(c => c.id !== componentId),
          updated_at: new Date().toISOString(),
        };
      });
      return {
        ...state,
        sections: newSections,
        selectedComponent: state.selectedComponent?.componentId === componentId ? null : state.selectedComponent,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'DUPLICATE_COMPONENT': {
      const { sectionId, componentId } = action.payload;
      const newSections = state.sections.map(s => {
        if (s.id !== sectionId) return s;
        const comps = s.components || [];
        const original = comps.find(c => c.id === componentId);
        if (!original) return s;
        const duplicated: ContainerComponent = {
          ...original,
          id: `comp_${Date.now()}`,
          props: { ...original.props },
        };
        const idx = comps.findIndex(c => c.id === componentId);
        const newComps = [...comps];
        newComps.splice(idx + 1, 0, duplicated);
        return { ...s, components: newComps, updated_at: new Date().toISOString() };
      });
      return {
        ...state,
        sections: newSections,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'REORDER_COMPONENTS': {
      const { sectionId, components } = action.payload;
      const newSections = state.sections.map(s =>
        s.id === sectionId ? { ...s, components, updated_at: new Date().toISOString() } : s
      );
      return {
        ...state,
        sections: newSections,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'SELECT_COMPONENT':
      return {
        ...state,
        selectedComponent: action.payload,
        selectedSectionId: action.payload ? null : state.selectedSectionId,
      };

    case 'UPDATE_SECTION_LAYOUT': {
      const { sectionId, layout } = action.payload;
      const newSections = state.sections.map(s => {
        if (s.id !== sectionId) return s;
        const content = (s.content || {}) as ContainerContent;
        return {
          ...s,
          content: { ...content, ...layout },
          updated_at: new Date().toISOString(),
        };
      });
      return {
        ...state,
        sections: newSections,
        isDirty: true,
        ...pushHistory(state, newSections),
      };
    }

    case 'SET_VIEWPORT':
      return { ...state, viewportMode: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'MARK_SAVED':
      return { ...state, isDirty: false, isSaving: false };

    case 'DISCARD_CHANGES':
      return {
        ...state,
        sections: action.payload,
        selectedSectionId: null,
        selectedComponent: null,
        isDirty: false,
        history: [action.payload],
        historyIndex: 0,
      };

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        sections: state.history[newIndex],
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        sections: state.history[newIndex],
        historyIndex: newIndex,
        isDirty: true,
      };
    }

    default:
      return state;
  }
}

// ===== CONTEXT =====

interface BuilderContextValue {
  state: BuilderState;
  // Secciones
  setSections: (sections: BuilderSection[]) => void;
  addSection: (section: BuilderSection, index?: number) => void;
  updateSection: (sectionId: string, updates: Partial<BuilderSection>) => void;
  deleteSection: (sectionId: string) => void;
  duplicateSection: (sectionId: string) => void;
  reorderSections: (sections: BuilderSection[]) => void;
  moveSection: (sectionId: string, direction: 'up' | 'down') => void;
  selectSection: (sectionId: string | null) => void;
  // Componentes
  addComponent: (sectionId: string, component: ContainerComponent, index?: number) => void;
  updateComponent: (sectionId: string, componentId: string, updates: Partial<ContainerComponent>) => void;
  deleteComponent: (sectionId: string, componentId: string) => void;
  duplicateComponent: (sectionId: string, componentId: string) => void;
  reorderComponents: (sectionId: string, components: ContainerComponent[]) => void;
  selectComponent: (selection: SelectedComponent | null) => void;
  updateSectionLayout: (sectionId: string, layout: Partial<ContainerContent>) => void;
  // Helpers
  getSelectedSection: () => BuilderSection | null;
  getSelectedComponent: () => ContainerComponent | null;
  // Viewport
  setViewportMode: (mode: ViewportMode) => void;
  // Responsive
  resolveComponentProps: (props: Record<string, unknown>) => Record<string, unknown>;
  resolveSectionContent: (content: Record<string, unknown>) => Record<string, unknown>;
  updateComponentResponsiveProp: (sectionId: string, componentId: string, key: string, value: unknown) => void;
  updateSectionLayoutResponsive: (sectionId: string, key: string, value: unknown) => void;
  clearResponsiveOverride: (sectionId: string, componentId: string, key: string) => void;
  hasResponsiveOverride: (props: Record<string, unknown>, key: string) => boolean;
  copyDesktopToViewport: (sectionId: string, componentId: string, responsiveKeys: string[]) => void;
  // Historial
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Guardado
  setSaving: (saving: boolean) => void;
  markSaved: () => void;
  discardChanges: (original: BuilderSection[]) => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('useBuilder debe usarse dentro de BuilderProvider');
  return ctx;
}

interface BuilderProviderProps {
  children: React.ReactNode;
  pageId: string;
  initialSections?: BuilderSection[];
}

export function BuilderProvider({ children, pageId, initialSections = [] }: BuilderProviderProps) {
  const [state, dispatch] = useReducer(builderReducer, {
    pageId,
    sections: initialSections,
    deletedSectionIds: [],
    selectedSectionId: null,
    selectedComponent: null,
    viewportMode: 'desktop',
    isDirty: false,
    isSaving: false,
    history: [initialSections],
    historyIndex: 0,
  });

  // Keyboard shortcuts para undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const value: BuilderContextValue = {
    state,
    setSections: useCallback((sections) => dispatch({ type: 'SET_SECTIONS', payload: sections }), []),
    addSection: useCallback((section, index) => dispatch({ type: 'ADD_SECTION', payload: { section, index } }), []),
    updateSection: useCallback((sectionId, updates) => dispatch({ type: 'UPDATE_SECTION', payload: { sectionId, updates } }), []),
    deleteSection: useCallback((sectionId) => dispatch({ type: 'DELETE_SECTION', payload: sectionId }), []),
    duplicateSection: useCallback((sectionId) => dispatch({ type: 'DUPLICATE_SECTION', payload: sectionId }), []),
    reorderSections: useCallback((sections) => dispatch({ type: 'REORDER_SECTIONS', payload: sections }), []),
    moveSection: useCallback((sectionId, direction) => dispatch({ type: 'MOVE_SECTION', payload: { sectionId, direction } }), []),
    selectSection: useCallback((sectionId) => dispatch({ type: 'SELECT_SECTION', payload: sectionId }), []),
    addComponent: useCallback((sectionId, component, index) => dispatch({ type: 'ADD_COMPONENT', payload: { sectionId, component, index } }), []),
    updateComponent: useCallback((sectionId, componentId, updates) => dispatch({ type: 'UPDATE_COMPONENT', payload: { sectionId, componentId, updates } }), []),
    deleteComponent: useCallback((sectionId, componentId) => dispatch({ type: 'DELETE_COMPONENT', payload: { sectionId, componentId } }), []),
    duplicateComponent: useCallback((sectionId, componentId) => dispatch({ type: 'DUPLICATE_COMPONENT', payload: { sectionId, componentId } }), []),
    reorderComponents: useCallback((sectionId, components) => dispatch({ type: 'REORDER_COMPONENTS', payload: { sectionId, components } }), []),
    selectComponent: useCallback((selection) => dispatch({ type: 'SELECT_COMPONENT', payload: selection }), []),
    updateSectionLayout: useCallback((sectionId, layout) => dispatch({ type: 'UPDATE_SECTION_LAYOUT', payload: { sectionId, layout } }), []),
    getSelectedSection: useCallback(() => {
      return state.sections.find(s => s.id === state.selectedSectionId) || null;
    }, [state.sections, state.selectedSectionId]),
    getSelectedComponent: useCallback(() => {
      if (!state.selectedComponent) return null;
      const section = state.sections.find(s => s.id === state.selectedComponent!.sectionId);
      return section?.components?.find(c => c.id === state.selectedComponent!.componentId) || null;
    }, [state.sections, state.selectedComponent]),
    setViewportMode: useCallback((mode) => dispatch({ type: 'SET_VIEWPORT', payload: mode }), []),
    // Responsive helpers
    resolveComponentProps: useCallback((props: Record<string, unknown>) => {
      return resolvePropsUtil(props, state.viewportMode);
    }, [state.viewportMode]),
    resolveSectionContent: useCallback((content: Record<string, unknown>) => {
      return resolveContentUtil(content, state.viewportMode);
    }, [state.viewportMode]),
    updateComponentResponsiveProp: useCallback((sectionId: string, componentId: string, key: string, value: unknown) => {
      const section = state.sections.find(s => s.id === sectionId);
      if (!section) return;
      const comp = section.components?.find(c => c.id === componentId);
      if (!comp) return;
      const newProps = setResponsiveProp(comp.props || {}, state.viewportMode, key, value);
      dispatch({ type: 'UPDATE_COMPONENT', payload: { sectionId, componentId, updates: { props: newProps } } });
    }, [state.viewportMode, state.sections]),
    updateSectionLayoutResponsive: useCallback((sectionId: string, key: string, value: unknown) => {
      const section = state.sections.find(s => s.id === sectionId);
      if (!section) return;
      const content = (section.content || {}) as Record<string, unknown>;
      const newContent = setResponsiveContent(content, state.viewportMode, key, value);
      dispatch({ type: 'UPDATE_SECTION_LAYOUT', payload: { sectionId, layout: newContent as Partial<ContainerContent> } });
    }, [state.viewportMode, state.sections]),
    clearResponsiveOverride: useCallback((sectionId: string, componentId: string, key: string) => {
      const section = state.sections.find(s => s.id === sectionId);
      if (!section) return;
      const comp = section.components?.find(c => c.id === componentId);
      if (!comp) return;
      const newProps = clearOverrideUtil(comp.props || {}, state.viewportMode, key);
      dispatch({ type: 'UPDATE_COMPONENT', payload: { sectionId, componentId, updates: { props: newProps } } });
    }, [state.viewportMode, state.sections]),
    hasResponsiveOverride: useCallback((props: Record<string, unknown>, key: string) => {
      return hasOverrideUtil(props, state.viewportMode, key);
    }, [state.viewportMode]),
    copyDesktopToViewport: useCallback((sectionId: string, componentId: string, responsiveKeys: string[]) => {
      const section = state.sections.find(s => s.id === sectionId);
      if (!section) return;
      const comp = section.components?.find(c => c.id === componentId);
      if (!comp) return;
      const newProps = copyDesktopUtil(comp.props || {}, state.viewportMode, responsiveKeys);
      dispatch({ type: 'UPDATE_COMPONENT', payload: { sectionId, componentId, updates: { props: newProps } } });
    }, [state.viewportMode, state.sections]),
    undo: useCallback(() => dispatch({ type: 'UNDO' }), []),
    redo: useCallback(() => dispatch({ type: 'REDO' }), []),
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    setSaving: useCallback((saving) => dispatch({ type: 'SET_SAVING', payload: saving }), []),
    markSaved: useCallback(() => dispatch({ type: 'MARK_SAVED' }), []),
    discardChanges: useCallback((original) => dispatch({ type: 'DISCARD_CHANGES', payload: original }), []),
  };

  return (
    <BuilderContext.Provider value={value}>
      {children}
    </BuilderContext.Provider>
  );
}
