'use client';

import * as React from 'react';
import { useAuth } from '@/modules/auth';
import { companyService } from '@/modules/company/services/company.service';
import { useRealtime } from '@/shared/providers/RealtimeProvider';

interface CompanySettingsContextValue {
  displayDecimals: number;
  setDisplayDecimals: (value: number) => void;
  loading: boolean;
}

export const CompanySettingsContext = React.createContext<CompanySettingsContextValue | null>(null);

export function CompanySettingsProvider({ children }: { children: React.ReactNode }) {
  const { company } = useAuth();
  const [displayDecimals, setDisplayDecimalsState] = React.useState(2);
  const [loading, setLoading] = React.useState(true);

  // Cargar decimales del company data
  React.useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const data = await companyService.getCompany(company.id);
        if (!cancelled) {
          const val = (data as any).display_decimals;
          const parsed = typeof val === 'number' ? val : 2;
          setDisplayDecimalsState(Math.min(4, Math.max(0, parsed)));
        }
      } catch {
        if (!cancelled) setDisplayDecimalsState(2);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();
    return () => { cancelled = true; };
  }, [company?.id]);

  const setDisplayDecimals = React.useCallback(async (value: number) => {
    const clamped = Math.min(4, Math.max(0, value));
    setDisplayDecimalsState(clamped);
    if (company?.id) {
      try {
        await companyService.updateSettings(company.id, { display_decimals: clamped });
      } catch (error) {
        console.error('Error saving display_decimals:', error);
      }
    }
  }, [company?.id]);

  // Escuchar cambios en tiempo real desde otros usuarios
  const { subscribe } = useRealtime();
  React.useEffect(() => {
    const unsubscribe = subscribe('company:settings_updated', (data: { display_decimals: number }) => {
      if (typeof data.display_decimals === 'number') {
        setDisplayDecimalsState(Math.min(4, Math.max(0, data.display_decimals)));
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const contextValue = React.useMemo(
    () => ({ displayDecimals, setDisplayDecimals, loading }),
    [displayDecimals, setDisplayDecimals, loading]
  );

  return (
    <CompanySettingsContext.Provider value={contextValue}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettings() {
  const context = React.useContext(CompanySettingsContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
}

export function useDisplayDecimals(): number {
  const context = React.useContext(CompanySettingsContext);
  return context?.displayDecimals ?? 2;
}
