import { useState, useEffect } from 'react';
import { costCentersService } from '../services/costCenters.service';
import type { CostCenterTreeNode } from '../types';

export function useCostCenterTree(enabled: boolean) {
  const [ccTree, setCcTree] = useState<CostCenterTreeNode[]>([]);
  const [ccFlatMap, setCcFlatMap] = useState<Map<string, CostCenterTreeNode>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    costCentersService.getTree().then(res => {
      setCcTree(res.data);
      const map = new Map<string, CostCenterTreeNode>();
      const flatten = (nodes: CostCenterTreeNode[]) => {
        for (const node of nodes) {
          map.set(node.id, node);
          if (node.children?.length) flatten(node.children);
        }
      };
      flatten(res.data);
      setCcFlatMap(map);
    }).catch(() => {});
  }, [enabled]);

  return { ccTree, ccFlatMap };
}
