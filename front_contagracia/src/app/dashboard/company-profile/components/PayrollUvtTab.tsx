'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Info, Calculator, Copy, Pencil, Check, X, Plus, Trash2, Save } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import toast from 'react-hot-toast';
import {
  payrollWithholdingUvtService,
  type UvtBracket,
  type CreateUvtBracketDto,
  type UpdateUvtBracketDto,
} from '@/modules/hr/services/payroll-withholding-uvt.service';
import { companySettingsService } from '@/modules/hr/services/company-settings.service';
import { cn } from '@/shared/lib/utils';

const formatNumber = (num: string | null): string => {
  if (!num) return '-';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(num));
};

const formatPercent = (rate: string): string => {
  const val = parseFloat(rate) * 100;
  return `${val.toFixed(1)}%`;
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

interface EditableBracket {
  id?: string;
  from_uvt: string;
  to_uvt: string;
  fixed_fee_uvt: string;
  marginal_rate: string;
  subtract_uvt: string;
  isNew?: boolean;
}

function EditableRow({
  bracket,
  onChange,
  onSave,
  onCancel,
  onDelete,
  saving,
  idx,
}: {
  bracket: EditableBracket;
  onChange: (field: keyof EditableBracket, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  idx: number;
}) {
  const inputClass =
    'w-full h-8 px-2 text-sm font-mono text-right bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50';

  return (
    <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
      <td className="px-4 py-2 text-center">
        <Badge variant="outline" className="text-[10px] font-mono">
          {idx + 1}
        </Badge>
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          value={bracket.from_uvt}
          onChange={(e) => onChange('from_uvt', e.target.value)}
          className={inputClass}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          value={bracket.to_uvt}
          onChange={(e) => onChange('to_uvt', e.target.value)}
          placeholder="∞"
          className={inputClass}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          value={bracket.fixed_fee_uvt}
          onChange={(e) => onChange('fixed_fee_uvt', e.target.value)}
          className={inputClass}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          value={bracket.marginal_rate}
          onChange={(e) => onChange('marginal_rate', e.target.value)}
          className={inputClass}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="text"
          inputMode="decimal"
          value={bracket.subtract_uvt}
          onChange={(e) => onChange('subtract_uvt', e.target.value)}
          className={inputClass}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1 justify-center">
          <button
            onClick={onSave}
            disabled={saving}
            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50"
            title="Guardar"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            title="Cancelar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="p-1.5 rounded-md text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
              title="Eliminar tramo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PayrollUvtTab() {
  const [loading, setLoading] = useState(true);
  const [replicating, setReplicating] = useState(false);
  const [brackets, setBrackets] = useState<UvtBracket[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  // UVT value per year
  const [uvtValue, setUvtValue] = useState<number>(0);
  const [editingUvt, setEditingUvt] = useState(false);
  const [uvtInput, setUvtInput] = useState('');
  const [savingUvt, setSavingUvt] = useState(false);

  // Bracket editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditableBracket | null>(null);
  const [savingBracket, setSavingBracket] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newBracket, setNewBracket] = useState<EditableBracket>({
    from_uvt: '',
    to_uvt: '',
    fixed_fee_uvt: '0',
    marginal_rate: '',
    subtract_uvt: '0',
    isNew: true,
  });

  const uvtSettingKey = `uvt_value_${year}`;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [uvtRes, allRes, settingsRes] = await Promise.all([
        payrollWithholdingUvtService.getByYear(year),
        payrollWithholdingUvtService.getAll(),
        companySettingsService.getByCategory('legal_params'),
      ]);
      setBrackets(uvtRes.data);
      const yearsSet = new Set(allRes.data.map((b: UvtBracket) => b.year));
      setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));

      // Check year-specific key first, then fallback to generic
      const yearKey = `uvt_value_${year}`;
      if (settingsRes?.[yearKey]?.value) {
        setUvtValue(Number(settingsRes[yearKey].value));
      } else if (settingsRes?.uvt_value?.value) {
        setUvtValue(Number(settingsRes.uvt_value.value));
      } else {
        setUvtValue(0);
      }
    } catch {
      toast.error('Error al cargar tabla UVT');
    } finally {
      setLoading(false);
      setEditingId(null);
      setEditData(null);
      setAddingNew(false);
    }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- UVT value editing ---
  const startEditUvt = () => {
    setUvtInput(String(uvtValue || ''));
    setEditingUvt(true);
  };

  const saveUvtValue = async () => {
    const num = parseInt(uvtInput.replace(/\D/g, ''), 10);
    if (!num) {
      setEditingUvt(false);
      return;
    }
    if (num === uvtValue) {
      setEditingUvt(false);
      return;
    }
    try {
      setSavingUvt(true);
      await companySettingsService.upsert('legal_params', uvtSettingKey, String(num));
      setUvtValue(num);
      toast.success(`Valor UVT ${year} actualizado`);
    } catch {
      toast.error('Error al actualizar valor UVT');
    } finally {
      setSavingUvt(false);
      setEditingUvt(false);
    }
  };

  // --- Replicate ---
  const handleReplicate = async (sourceYear: number) => {
    try {
      setReplicating(true);
      await payrollWithholdingUvtService.replicate(sourceYear, year);
      toast.success(`Tramos UVT replicados de ${sourceYear} a ${year}`);
      fetchData();
    } catch {
      toast.error('Error al replicar tramos UVT');
    } finally {
      setReplicating(false);
    }
  };

  // --- Bracket CRUD ---
  const startEdit = (bracket: UvtBracket) => {
    setEditingId(bracket.id);
    setEditData({
      id: bracket.id,
      from_uvt: bracket.from_uvt,
      to_uvt: bracket.to_uvt ?? '',
      fixed_fee_uvt: bracket.fixed_fee_uvt,
      marginal_rate: (parseFloat(bracket.marginal_rate) * 100).toString(),
      subtract_uvt: bracket.subtract_uvt,
    });
    setAddingNew(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async () => {
    if (!editData?.id) return;
    try {
      setSavingBracket(true);
      const dto: UpdateUvtBracketDto = {
        from_uvt: parseFloat(editData.from_uvt),
        to_uvt: editData.to_uvt ? parseFloat(editData.to_uvt) : null,
        fixed_fee_uvt: parseFloat(editData.fixed_fee_uvt || '0'),
        marginal_rate: parseFloat(editData.marginal_rate) / 100,
        subtract_uvt: parseFloat(editData.subtract_uvt || '0'),
      };
      await payrollWithholdingUvtService.update(editData.id, dto);
      toast.success('Tramo actualizado');
      fetchData();
    } catch {
      toast.error('Error al actualizar tramo');
    } finally {
      setSavingBracket(false);
    }
  };

  const deleteBracket = async (id: string) => {
    try {
      setSavingBracket(true);
      await payrollWithholdingUvtService.remove(id);
      toast.success('Tramo eliminado');
      fetchData();
    } catch {
      toast.error('Error al eliminar tramo');
    } finally {
      setSavingBracket(false);
    }
  };

  const startAdd = () => {
    setAddingNew(true);
    setEditingId(null);
    setEditData(null);
    setNewBracket({
      from_uvt: '',
      to_uvt: '',
      fixed_fee_uvt: '0',
      marginal_rate: '',
      subtract_uvt: '0',
      isNew: true,
    });
  };

  const saveNew = async () => {
    if (!newBracket.from_uvt || !newBracket.marginal_rate) {
      toast.error('Desde UVT y Tarifa Marginal son obligatorios');
      return;
    }
    try {
      setSavingBracket(true);
      const dto: CreateUvtBracketDto = {
        year,
        from_uvt: parseFloat(newBracket.from_uvt),
        to_uvt: newBracket.to_uvt ? parseFloat(newBracket.to_uvt) : null,
        fixed_fee_uvt: parseFloat(newBracket.fixed_fee_uvt || '0'),
        marginal_rate: parseFloat(newBracket.marginal_rate) / 100,
        subtract_uvt: parseFloat(newBracket.subtract_uvt || '0'),
      };
      await payrollWithholdingUvtService.create(dto);
      toast.success('Tramo agregado');
      fetchData();
    } catch {
      toast.error('Error al crear tramo');
    } finally {
      setSavingBracket(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card — UVT value + year selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                Valor UVT {year}:
              </span>
              {editingUvt ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-blue-700 dark:text-blue-300">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={uvtInput}
                    onChange={(e) => setUvtInput(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveUvtValue();
                      if (e.key === 'Escape') setEditingUvt(false);
                    }}
                    autoFocus
                    disabled={savingUvt}
                    className="w-24 h-7 px-2 text-sm font-semibold font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    onClick={saveUvtValue}
                    disabled={savingUvt}
                    className="p-1 rounded-md text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50"
                  >
                    {savingUvt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setEditingUvt(false)}
                    className="p-1 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditUvt}
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-900 dark:text-blue-200 hover:text-blue-700 dark:hover:text-blue-100 transition-colors group"
                >
                  {uvtValue > 0 ? formatCurrency(uvtValue) : (
                    <span className="text-blue-400 italic">Sin definir</span>
                  )}
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                </button>
              )}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Fórmula: (Base UVT - Restar UVT) &times; Tarifa Marginal + Tarifa Fija UVT
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-blue-200 dark:border-blue-700">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                year === y
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {brackets.length > 0 || addingNew ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-16">Tramo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Desde UVT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Hasta UVT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Tarifa Fija (UVT)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Tarifa Marginal %</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Restar UVT</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {brackets.map((bracket, idx) => {
                  if (editingId === bracket.id && editData) {
                    return (
                      <EditableRow
                        key={bracket.id}
                        bracket={editData}
                        onChange={(field, value) =>
                          setEditData((prev) => prev ? { ...prev, [field]: value } : prev)
                        }
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        onDelete={() => deleteBracket(bracket.id)}
                        saving={savingBracket}
                        idx={idx}
                      />
                    );
                  }

                  const isExempt = parseFloat(bracket.marginal_rate) === 0;
                  const isLast = !bracket.to_uvt;
                  return (
                    <tr
                      key={bracket.id}
                      onClick={() => startEdit(bracket)}
                      className={cn(
                        'transition-colors cursor-pointer',
                        isExempt
                          ? 'bg-green-50/50 dark:bg-green-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20'
                          : isLast
                            ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50 dark:hover:bg-red-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
                      )}
                    >
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {idx + 1}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                        {formatNumber(bracket.from_uvt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                        {bracket.to_uvt ? formatNumber(bracket.to_uvt) : (
                          <span className="text-lg">&infin;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {formatNumber(bracket.fixed_fee_uvt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isExempt ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]">Exento</Badge>
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatPercent(bracket.marginal_rate)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
                        {formatNumber(bracket.subtract_uvt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Pencil className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mx-auto" />
                      </td>
                    </tr>
                  );
                })}

                {/* New bracket row */}
                {addingNew && (
                  <EditableRow
                    bracket={newBracket}
                    onChange={(field, value) =>
                      setNewBracket((prev) => ({ ...prev, [field]: value }))
                    }
                    onSave={saveNew}
                    onCancel={() => setAddingNew(false)}
                    saving={savingBracket}
                    idx={brackets.length}
                  />
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              {brackets.length} tramos &middot; Art. 383 Estatuto Tributario &middot; Click en fila para editar
            </div>
            {!addingNew && !editingId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startAdd}
                className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar tramo
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/20">
          <Calculator className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No hay tabla UVT para {year}</p>
          <div className="mt-4 flex flex-col items-center gap-3">
            {availableYears.filter((y) => y !== year).length > 0 && (
              <>
                <p className="text-xs text-gray-400">Replicar tramos desde otro año:</p>
                <div className="flex gap-2">
                  {availableYears.filter((y) => y !== year).slice(0, 3).map((y) => (
                    <button
                      key={y}
                      onClick={() => handleReplicate(y)}
                      disabled={replicating}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {replicating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copiar de {y}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="text-xs text-gray-400">o</p>
            <Button
              variant="outline"
              size="sm"
              onClick={startAdd}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Crear primer tramo manualmente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
