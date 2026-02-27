'use client';

/**
 * BuilderToolbar - Barra superior del Page Builder
 * Undo/Redo, Viewport, Guardar, Preview
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Undo2, Redo2, Monitor, Tablet, Smartphone,
  Save, Eye, ArrowLeft, Loader2, AlertCircle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useBuilder, type ViewportMode } from './BuilderContext';

interface BuilderToolbarProps {
  pageTitle: string;
  onSave: () => void;
  onPreview: () => void;
}

const VIEWPORT_BUTTONS: { mode: ViewportMode; icon: React.ElementType; label: string }[] = [
  { mode: 'desktop', icon: Monitor, label: 'Desktop' },
  { mode: 'tablet', icon: Tablet, label: 'Tablet' },
  { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export function BuilderToolbar({ pageTitle, onSave, onPreview }: BuilderToolbarProps) {
  const router = useRouter();
  const { state, undo, redo, canUndo, canRedo, setViewportMode } = useBuilder();

  return (
    <div className="h-14 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between px-4 shrink-0">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
          {pageTitle}
        </h1>
        {state.isDirty && (
          <span className="flex items-center gap-1 text-xs text-amber-500">
            <AlertCircle className="w-3 h-3" />
            Sin guardar
          </span>
        )}
      </div>

      {/* Center: Undo/Redo + Viewport */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-4">
          <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          {VIEWPORT_BUTTONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewportMode(mode)}
              title={label}
              className={`p-1.5 rounded-md transition-colors ${
                state.viewportMode === mode
                  ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Right: Preview + Save */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="w-4 h-4 mr-1" />
          Preview
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={state.isSaving || !state.isDirty}
        >
          {state.isSaving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
}
