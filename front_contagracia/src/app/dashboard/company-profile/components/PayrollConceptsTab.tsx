'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, Search, ChevronLeft, ChevronRight, Percent } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { AccountSelect } from '@/shared/components/ui/account-select';
import toast from 'react-hot-toast';
import {
  payrollConceptsService,
  type PayrollConceptItem,
  type PayrollConceptsResponse,
} from '@/modules/hr/services/payroll-concepts.service';
import { cn } from '@/shared/lib/utils';

type ConceptTypeFilter = 'ALL' | 'ACCRUED' | 'DEDUCTION' | 'PROVISION' | 'PARAFISCAL';
type UpdatableField = 'debit_account_code' | 'administrative_debit_account_code' | 'credit_account_code' | 'default_percentage';

const PAGE_SIZE = 10;

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  ACCRUED:    { label: 'Devengado',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  DEDUCTION:  { label: 'Deducción',  cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  PROVISION:  { label: 'Provisión',  cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  PARAFISCAL: { label: 'Parafiscal', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
};

const FILTER_TABS: { key: ConceptTypeFilter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ACCRUED', label: 'Devengados' },
  { key: 'DEDUCTION', label: 'Deducciones' },
  { key: 'PROVISION', label: 'Provisiones' },
  { key: 'PARAFISCAL', label: 'Parafiscales' },
];

export function PayrollConceptsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PayrollConceptsResponse | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ConceptTypeFilter>('ALL');
  const [page, setPage] = useState(1);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const savingRef = useRef(savingKeys);
  savingRef.current = savingKeys;

  const fetchConcepts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await payrollConceptsService.getAll();
      setData(res);
    } catch {
      toast.error('Error al cargar conceptos de nómina');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConcepts(); }, [fetchConcepts]);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const counts = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    const c: Record<string, number> = { ALL: data.data.length };
    for (const item of data.data) c[item.concept_type] = (c[item.concept_type] || 0) + 1;
    return c;
  }, [data]);

  const filteredConcepts = useMemo(() =>
    data?.data.filter((c) => {
      const matchesType = typeFilter === 'ALL' || c.concept_type === typeFilter;
      const matchesSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.key.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    }) ?? []
  , [data, search, typeFilter]);

  const totalPages = Math.ceil(filteredConcepts.length / PAGE_SIZE);
  const paginatedConcepts = filteredConcepts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFieldChange = async (concept: PayrollConceptItem, field: UpdatableField, value: string) => {
    const key = `${concept.key}:${field}`;
    if (savingRef.current.has(key)) return;

    setSavingKeys((prev) => new Set(prev).add(key));
    try {
      await payrollConceptsService.update(concept.key, { [field]: value || undefined });
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, data: prev.data.map((c) => c.key === concept.key ? { ...c, [field]: value || null } : c) };
      });
    } catch {
      toast.error(`Error al actualizar ${concept.name}`);
    } finally {
      setSavingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        <p className="text-xs text-gray-400">Cargando conceptos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar concepto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                typeFilter === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              {tab.label}
              {counts[tab.key] != null && (
                <span className={cn(
                  'text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold',
                  typeFilter === tab.key
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'bg-gray-200/70 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                )}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left pl-4 pr-2 py-2.5 font-medium text-[11px] text-gray-400 uppercase tracking-wider w-[200px]">Concepto</th>
                <th className="text-center px-1 py-2.5 font-medium text-[11px] text-gray-400 uppercase tracking-wider w-[60px]">Tipo</th>
                <th className="text-center px-1 py-2.5 font-medium text-[11px] text-gray-400 uppercase tracking-wider w-[70px]">%</th>
                <th className="text-left px-1.5 py-2.5 font-medium text-[11px] text-gray-400 uppercase tracking-wider">Débito Op.</th>
                <th className="text-left px-1.5 py-2.5 font-medium text-[11px] text-gray-400 uppercase tracking-wider">Débito Admin.</th>
                <th className="text-left px-1.5 pr-4 py-2.5 font-medium text-[11px] text-gray-400 uppercase tracking-wider">Crédito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {paginatedConcepts.map((concept) => (
                <ConceptRow
                  key={concept.key}
                  concept={concept}
                  savingKeys={savingKeys}
                  onFieldChange={handleFieldChange}
                />
              ))}
              {paginatedConcepts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No se encontraron conceptos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <span className="text-[11px] text-gray-400 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredConcepts.length)} de {filteredConcepts.length}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-6 h-6 rounded text-[11px] font-medium transition-colors',
                      page === p
                        ? 'bg-indigo-500 text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Concept Row ─── */

function ConceptRow({
  concept,
  savingKeys,
  onFieldChange,
}: {
  concept: PayrollConceptItem;
  savingKeys: Set<string>;
  onFieldChange: (concept: PayrollConceptItem, field: UpdatableField, value: string) => void;
}) {
  const [pctValue, setPctValue] = useState(concept.default_percentage || '');
  const badge = TYPE_BADGE[concept.concept_type] || { label: concept.concept_type, cls: 'bg-gray-100 text-gray-700' };

  useEffect(() => {
    setPctValue(concept.default_percentage || '');
  }, [concept.default_percentage]);

  const handlePctBlur = () => {
    const trimmed = pctValue.trim();
    if (trimmed !== (concept.default_percentage || '')) {
      onFieldChange(concept, 'default_percentage', trimmed);
    }
  };

  const isSaving = (field: string) => savingKeys.has(`${concept.key}:${field}`);

  return (
    <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
      {/* Name + key */}
      <td className="pl-4 pr-2 py-1.5">
        <div className="leading-tight">
          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 block truncate">{concept.name}</span>
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{concept.key}</span>
        </div>
      </td>

      {/* Type badge */}
      <td className="px-1 py-1.5 text-center">
        <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full', badge.cls)}>
          {badge.label}
        </span>
      </td>

      {/* Percentage */}
      <td className="px-1 py-1.5 text-center">
        {concept.is_percentage ? (
          <div className="relative inline-flex items-center">
            <input
              type="text"
              inputMode="decimal"
              value={pctValue}
              onChange={(e) => setPctValue(e.target.value)}
              onBlur={handlePctBlur}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              disabled={isSaving('default_percentage')}
              className={cn(
                'w-[58px] h-7 pl-1.5 pr-5 text-[12px] font-mono text-right rounded border',
                'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800',
                'text-gray-700 dark:text-gray-300',
                'focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400',
                'disabled:opacity-50',
              )}
              placeholder="0"
            />
            <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
        )}
      </td>

      {/* Debit Op */}
      <td className="px-1.5 py-1">
        <AccountSelect
          value={concept.debit_account_code || ''}
          valueLabel={concept.debit_account_code || ''}
          onChange={(code) => onFieldChange(concept, 'debit_account_code', code)}
          placeholder="—"
          usePortal
          className="text-xs"
        />
      </td>

      {/* Debit Admin */}
      <td className="px-1.5 py-1">
        <AccountSelect
          value={concept.administrative_debit_account_code || ''}
          valueLabel={concept.administrative_debit_account_code || ''}
          onChange={(code) => onFieldChange(concept, 'administrative_debit_account_code', code)}
          placeholder="—"
          usePortal
          className="text-xs"
        />
      </td>

      {/* Credit */}
      <td className="px-1.5 pr-4 py-1">
        <AccountSelect
          value={concept.credit_account_code || ''}
          valueLabel={concept.credit_account_code || ''}
          onChange={(code) => onFieldChange(concept, 'credit_account_code', code)}
          placeholder="—"
          usePortal
          className="text-xs"
        />
      </td>
    </tr>
  );
}
