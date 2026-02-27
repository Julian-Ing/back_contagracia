import { useContext } from 'react';
import { CompanyModulesContext } from '@/shared/providers/CompanyModulesProvider';

/**
 * Hook para obtener los módulos del plan de la compañía.
 * Lee del CompanyModulesProvider (contexto compartido en el dashboard layout).
 * Esto es diferente a los permisos del usuario — son los módulos que la compañía tiene contratados.
 */
export const useCompanyModules = () => {
  const context = useContext(CompanyModulesContext);

  // Fallback seguro si se usa fuera del provider (no debería pasar en dashboard)
  const modules = context?.modules ?? [];
  const planName = context?.planName ?? '';
  const loading = context?.loading ?? false;

  const hasModule = (moduleKey: string): boolean => {
    return modules.includes(moduleKey);
  };

  const hasAnyModule = (moduleKeys: string[]): boolean => {
    return moduleKeys.some((key) => modules.includes(key));
  };

  const hasAllModules = (moduleKeys: string[]): boolean => {
    return moduleKeys.every((key) => modules.includes(key));
  };

  return {
    modules,
    planName,
    loading,
    error: null,
    hasModule,
    hasAnyModule,
    hasAllModules,
  };
};
