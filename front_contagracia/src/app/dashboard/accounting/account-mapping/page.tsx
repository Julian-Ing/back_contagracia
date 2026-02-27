'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { MapPin, Search, Loader2, RotateCcw, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { accountingConfigService, type AccountingConfigItem } from '@/modules/accounting';
import { Button } from '@/shared/components/ui/button';
import { usePermissions } from '@/shared/hooks';
import { loadFilters, saveFilters } from '@/shared/hooks/usePersistedFilters';
import toast from 'react-hot-toast';

interface ConfigRowProps {
  config: AccountingConfigItem;
  onUpdate: (key: string, dto: { account_code?: string | null }) => Promise<void>;
  onReset: (key: string) => Promise<void>;
  canEdit: boolean;
  saving: string | null;
}

function ConfigRow({ config, onUpdate, onReset, canEdit, saving }: ConfigRowProps) {
  const isSaving = saving === config.key;
  const hasDefault = !!config.default;

  // Estado local para manejar cambios antes de guardar
  const [localAccount, setLocalAccount] = useState(config.account_code || '');
  const [isDirty, setIsDirty] = useState(false);

  // Sincronizar cuando cambian los props
  useEffect(() => {
    setLocalAccount(config.account_code || '');
    setIsDirty(false);
  }, [config.account_code]);

  const handleSave = async () => {
    await onUpdate(config.key, {
      account_code: localAccount || null,
    });
    setIsDirty(false);
  };

  const handleAccountChange = (code: string) => {
    setLocalAccount(code);
    setIsDirty(code !== (config.account_code || ''));
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex flex-col gap-3">
        {/* Header con key y descripción */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <code className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
              {config.key}
            </code>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {config.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && canEdit && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Guardar
                  </>
                )}
              </Button>
            )}
            {hasDefault && canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReset(config.key)}
                disabled={isSaving}
                className="h-8 text-gray-500"
                title="Restaurar valor por defecto"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Selector de cuenta */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
            Cuenta
            {config.default && (
              <span className="ml-2 text-gray-400">(default: {config.default})</span>
            )}
          </label>
          <AccountSelect
            value={localAccount}
            valueLabel={config.account ? `${config.account.code} - ${config.account.name}` : ''}
            onChange={handleAccountChange}
            placeholder="Seleccionar cuenta..."
            disabled={!canEdit}
            showCreateButton={false}
            clearable={false}
          />
        </div>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

export default function AccountMappingPage() {
  const { can } = usePermissions();
  const canEdit = can('account_mapping.configure');

  const saved = useRef(loadFilters<{ search?: string }>('account-mapping')).current;

  const [configs, setConfigs] = useState<AccountingConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(saved.search ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(saved.search ?? '');
  const [saving, setSaving] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset a página 1 cuando cambia búsqueda
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Persist filters
  useEffect(() => {
    saveFilters('account-mapping', { search: debouncedSearch });
  }, [debouncedSearch]);

  // Cargar configuraciones
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await accountingConfigService.findAll(debouncedSearch || undefined, page, ITEMS_PER_PAGE);
      setConfigs(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Actualizar configuración
  const handleUpdate = async (key: string, dto: any) => {
    setSaving(key);
    try {
      const updated = await accountingConfigService.update(key, dto);
      setConfigs(prev => prev.map(c => c.key === key ? updated : c));
      toast.success('Configuración guardada');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  // Resetear a default
  const handleReset = async (key: string) => {
    setSaving(key);
    try {
      const updated = await accountingConfigService.resetToDefault(key);
      setConfigs(prev => prev.map(c => c.key === key ? updated : c));
      toast.success('Restaurado a valor por defecto');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al restaurar');
    } finally {
      setSaving(null);
    }
  };

  return (
    <ProtectedRoute permission="account_mapping.view" deniedMessage="No tienes permisos para ver el Mapeo Contable.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-teal-500 text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mapeo Contable</h1>
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Cargando...' : `${total} conceptos`}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por key o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <p>{error}</p>
            <Button variant="outline" onClick={loadConfigs} className="mt-4">
              Reintentar
            </Button>
          </div>
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <MapPin className="h-12 w-12 mb-4" />
            <p>{search ? 'No se encontraron conceptos con ese filtro' : 'No hay configuraciones'}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {configs.map(config => (
                <ConfigRow
                  key={config.key}
                  config={config}
                  onUpdate={handleUpdate}
                  onReset={handleReset}
                  canEdit={canEdit}
                  saving={saving}
                />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-500">
                  Página {page} de {totalPages} ({total} conceptos)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
