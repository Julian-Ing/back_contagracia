'use client';

/**
 * BuilderLibrary - Panel derecho con biblioteca de bloques y componentes arrastrables
 * Agrupados por categoría, con búsqueda
 */

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, GripVertical } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { BLOCK_CATEGORIES, BLOCKS, searchBlocks, type BlockDefinition } from './BlockRegistry';
import {
  COMPONENT_CATEGORIES, COMPONENTS, searchComponents,
  type ComponentDefinition,
} from './ComponentRegistry';

export function BuilderLibrary() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'blocks' | 'components'>('components');

  const filteredBlocks = search ? searchBlocks(search) : BLOCKS;
  const filteredComponents = search ? searchComponents(search) : COMPONENTS;

  return (
    <div className="w-64 border-l border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setTab('components')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
            tab === 'components'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Componentes
        </button>
        <button
          onClick={() => setTab('blocks')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
            tab === 'blocks'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Bloques
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-3 pb-3 space-y-4">
        {tab === 'blocks' ? (
          BLOCK_CATEGORIES.map((cat) => {
            const items = filteredBlocks.filter(b => b.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  {cat.label}
                </h4>
                <div className="space-y-1.5">
                  {items.map((block) => (
                    <DraggableBlock key={block.type} block={block} />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          COMPONENT_CATEGORIES.map((cat) => {
            const items = filteredComponents.filter(c => c.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  {cat.label}
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((comp) => (
                    <DraggableComponent key={comp.type} component={comp} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DraggableBlock({ block }: { block: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${block.type}`,
    data: { type: 'block', blockType: block.type },
  });

  const Icon = block.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-slate-700'
      }`}
    >
      <GripVertical className="w-3 h-3 text-gray-300 shrink-0" />
      <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{block.label}</div>
        <div className="text-[10px] text-gray-400 truncate">{block.description}</div>
      </div>
    </div>
  );
}

function DraggableComponent({ component }: { component: ComponentDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `component-${component.type}`,
    data: { type: 'component', componentType: component.type },
  });

  const Icon = component.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-slate-600 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="w-5 h-5 text-indigo-500" />
      <span className="text-[10px] text-gray-600 dark:text-gray-300 text-center leading-tight">
        {component.label}
      </span>
    </div>
  );
}
