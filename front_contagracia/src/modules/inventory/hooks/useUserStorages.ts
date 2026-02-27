'use client';

import { useState, useEffect, useCallback } from 'react';
import { warehousesService } from '../services/warehouses.service';

export interface UserStorageOption {
  storage_id: string;
  storage_name: string;
  storage_consecutive: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_consecutive: string;
}

export interface UserWarehouseGroup {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_consecutive: string;
  storages: Array<{ id: string; consecutive: string; name: string }>;
}

interface UseUserStoragesReturn {
  /** Grouped by warehouse (raw API response) */
  warehouses: UserWarehouseGroup[];
  /** Flat list of storages with warehouse info */
  storages: UserStorageOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUserStorages(): UseUserStoragesReturn {
  const [warehouses, setWarehouses] = useState<UserWarehouseGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await warehousesService.getMyStorages();
      setWarehouses(data);
    } catch (err) {
      console.error('Error loading user storages:', err);
      setError('Error al cargar bodegas del usuario');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Flat list derived from warehouses
  const storages: UserStorageOption[] = warehouses.flatMap((w) =>
    w.storages.map((s) => ({
      storage_id: s.id,
      storage_name: s.name,
      storage_consecutive: s.consecutive,
      warehouse_id: w.warehouse_id,
      warehouse_name: w.warehouse_name,
      warehouse_consecutive: w.warehouse_consecutive,
    })),
  );

  return { warehouses, storages, isLoading, error, refresh: load };
}
