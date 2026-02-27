'use client';

import * as React from 'react';
import { useAuth } from '@/modules/auth';
import { authClient } from '@/shared/services/api/apiClient';
import { useRealtime } from '@/shared/providers/RealtimeProvider';

interface CompanyModulesContextValue {
  modules: string[];
  planName: string;
  loading: boolean;
}

export const CompanyModulesContext = React.createContext<CompanyModulesContextValue | null>(null);

export function CompanyModulesProvider({ children }: { children: React.ReactNode }) {
  const { company } = useAuth();
  const [modules, setModules] = React.useState<string[]>([]);
  const [planName, setPlanName] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Cargar módulos del plan
  React.useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchModules = async () => {
      try {
        const response = await authClient.get('/permissions/modules');
        if (!cancelled) {
          setModules(response.data.modules?.map((m: any) => m.module_key || m) || []);
          setPlanName(response.data.plan_name || response.data.plan?.name || '');
        }
      } catch (err) {
        console.error('[CompanyModulesProvider] Error:', err);
        if (!cancelled) setModules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchModules();
    return () => { cancelled = true; };
  }, [company?.id]);

  // Escuchar cambios de plan/módulos en tiempo real
  const { subscribe } = useRealtime();
  React.useEffect(() => {
    const unsubscribe = subscribe('company:modules_updated', (data: { modules?: string[]; plan_name?: string }) => {
      if (Array.isArray(data.modules)) {
        setModules(data.modules);
      }
      if (data.plan_name) {
        setPlanName(data.plan_name);
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const contextValue = React.useMemo(
    () => ({ modules, planName, loading }),
    [modules, planName, loading]
  );

  return (
    <CompanyModulesContext.Provider value={contextValue}>
      {children}
    </CompanyModulesContext.Provider>
  );
}
