import React, { useMemo } from 'react';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import type { CostCenterTreeNode } from '../types';

interface CostCenterCascadeSelectProps {
  ccTree: CostCenterTreeNode[];
  ccFlatMap: Map<string, CostCenterTreeNode>;
  value: string;
  path: string[];
  onChange: (id: string, label: string, path: string[]) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  itemWidth?: 'auto' | 'fixed';
  placeholder?: string;
}

/** Build path from leaf node ID walking up parent chain */
function buildPathFromValue(ccFlatMap: Map<string, CostCenterTreeNode>, value: string): string[] {
  const result: string[] = [];
  let current = ccFlatMap.get(value);
  while (current) {
    result.unshift(current.id);
    current = current.parent_id ? ccFlatMap.get(current.parent_id) : undefined;
  }
  return result;
}

export function CostCenterCascadeSelect({
  ccTree,
  ccFlatMap,
  value,
  path,
  onChange,
  disabled,
  size = 'sm',
  itemWidth = 'fixed',
  placeholder,
}: CostCenterCascadeSelectProps) {
  const h = size === 'sm' ? 'h-7' : 'h-8';
  const cls = `${h} text-xs [&_button]:${h} [&_button]:text-xs [&_button]:py-0`;

  // Auto-resolve path from value when path is empty (e.g. edit precarga)
  const effectivePath = useMemo(() => {
    if (path.length > 0 || !value || ccFlatMap.size === 0) return path;
    return buildPathFromValue(ccFlatMap, value);
  }, [path, value, ccFlatMap]);

  const selects: React.ReactNode[] = [];
  let currentNodes = ccTree.filter(n => n.is_active);

  for (let level = 0; level <= effectivePath.length; level++) {
    if (currentNodes.length === 0) break;
    const selectedId = effectivePath[level] || '';
    const lvl = level;

    selects.push(
      <div key={lvl} className={itemWidth === 'fixed' ? 'w-44' : 'flex-1 min-w-0'}>
        <SearchableSelect
          options={currentNodes.map(n => ({ value: n.id, label: `${n.consecutive} - ${n.name}` }))}
          value={selectedId}
          onChange={(v) => {
            const newPath = effectivePath.slice(0, lvl);
            newPath[lvl] = v;
            const node = ccFlatMap.get(v);
            onChange(v, node ? `${node.consecutive} - ${node.name}` : '', newPath);
          }}
          placeholder={lvl === 0 ? (placeholder || 'Centro de costos...') : 'Sub-centro...'}
          className={cls}
          disabled={disabled}
        />
      </div>
    );

    if (!selectedId) break;
    const selectedNode = ccFlatMap.get(selectedId);
    if (selectedNode?.children?.length) {
      currentNodes = selectedNode.children.filter(n => n.is_active);
    } else {
      break;
    }
  }

  return <>{selects}</>;
}
