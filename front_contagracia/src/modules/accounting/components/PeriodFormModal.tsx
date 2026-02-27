'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { accountingPeriodsService } from '../services/accountingPeriods.service';
import type { CreatePeriodData, AccountingPeriod } from '../types/accountingPeriods';

interface PeriodFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePeriodData) => Promise<unknown>;
  canCreateMonthly: boolean;
  canCreateAnnual: boolean;
}

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function PeriodFormModal({
  open,
  onClose,
  onSubmit,
  canCreateMonthly,
  canCreateAnnual,
}: PeriodFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAnnualPeriods, setOpenAnnualPeriods] = useState<AccountingPeriod[]>([]);
  const [allAnnualPeriods, setAllAnnualPeriods] = useState<AccountingPeriod[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);

  // Form state
  const [isAnnual, setIsAnnual] = useState(() => {
    if (canCreateMonthly && canCreateAnnual) return false;
    if (canCreateAnnual) return true;
    return false;
  });
  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState('1');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [description, setDescription] = useState('');

  // Load periods when modal opens
  useEffect(() => {
    if (open) {
      setLoadingPeriods(true);

      // Cargar todos los períodos anuales para verificar si el año actual ya existe
      Promise.all([
        accountingPeriodsService.getOpenAnnualPeriods(),
        accountingPeriodsService.getAll({ is_annual: true, limit: 100 }),
      ])
        .then(([openPeriods, allPeriodsResponse]) => {
          setOpenAnnualPeriods(openPeriods);
          setAllAnnualPeriods(allPeriodsResponse.data);

          if (openPeriods.length > 0 && !selectedParentId) {
            setSelectedParentId(openPeriods[0].id);
          }
        })
        .catch(err => console.error('Error loading periods:', err))
        .finally(() => setLoadingPeriods(false));
    }
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const defaultIsAnnual = canCreateMonthly && canCreateAnnual ? false : canCreateAnnual;
      setIsAnnual(defaultIsAnnual);
      setSelectedMonth('1');
      setSelectedParentId('');
      setDescription('');
      setError(null);
    }
  }, [open, canCreateMonthly, canCreateAnnual]);

  // Check if current year already has an annual period
  const currentYearPeriodExists = allAnnualPeriods.some(p => p.year === currentYear);

  // Get year from parent period for monthly
  const parentPeriod = openAnnualPeriods.find(p => p.id === selectedParentId);
  const yearForMonthly = parentPeriod?.year || currentYear;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate permission
    if (isAnnual && !canCreateAnnual) {
      setError('No tienes permiso para crear períodos anuales');
      setLoading(false);
      return;
    }
    if (!isAnnual && !canCreateMonthly) {
      setError('No tienes permiso para crear períodos mensuales');
      setLoading(false);
      return;
    }

    // Validate parent for monthly
    if (!isAnnual && !selectedParentId) {
      setError('Debes seleccionar un período anual');
      setLoading(false);
      return;
    }

    const year = isAnnual ? currentYear : yearForMonthly;
    const month = Number(selectedMonth);

    // Build data
    let name: string;
    let start_date: string;
    let end_date: string;

    if (isAnnual) {
      name = `Año ${year}`;
      start_date = formatDate(year, 1, 1);
      end_date = formatDate(year, 12, 31);
    } else {
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || '';
      name = `${monthName} ${year}`;
      start_date = formatDate(year, month, 1);
      end_date = formatDate(year, month, getLastDayOfMonth(year, month));
    }

    const data: CreatePeriodData = {
      name,
      start_date,
      end_date,
      year,
      is_annual: isAnnual,
      parent_period_id: isAnnual ? undefined : selectedParentId,
      description: description || undefined,
    };

    try {
      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al crear período');
    } finally {
      setLoading(false);
    }
  };

  const canToggleType = canCreateMonthly && canCreateAnnual;

  const parentPeriodOptions = openAnnualPeriods.map(period => ({
    value: period.id,
    label: `${period.name} (${period.status === 'REOPENED' ? 'Reabierto' : 'Abierto'})`,
  }));

  const month = Number(selectedMonth);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Período Contable</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          {/* Toggle tipo de período */}
          <div className="flex items-center gap-3">
            <Switch
              id="is_annual"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              disabled={!canToggleType}
            />
            <Label htmlFor="is_annual" className={`cursor-pointer ${!canToggleType ? 'opacity-50' : ''}`}>
              Período Anual (cierra cuentas 4, 5, 6 a patrimonio)
            </Label>
          </div>
          {!canToggleType && (
            <p className="text-xs text-muted-foreground">
              {canCreateAnnual ? 'Solo puedes crear períodos anuales' : 'Solo puedes crear períodos mensuales'}
            </p>
          )}

          {isAnnual ? (
            /* Período Anual: Año actual fijo */
            <div className="space-y-2">
              {loadingPeriods ? (
                <p className="text-sm text-muted-foreground">Verificando períodos...</p>
              ) : currentYearPeriodExists ? (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Ya existe el período anual {currentYear}. No puedes crear otro.
                </p>
              ) : (
                <>
                  <Label>Año</Label>
                  <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 flex items-center">
                    <span className="font-medium">{currentYear}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se creará: <strong>Año {currentYear}</strong> (01/01/{currentYear} - 31/12/{currentYear})
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Período Mensual: Select de período anual padre + mes */
            <>
              <div className="space-y-2">
                <Label>Período Anual</Label>
                {loadingPeriods ? (
                  <p className="text-sm text-muted-foreground">Cargando períodos...</p>
                ) : openAnnualPeriods.length === 0 ? (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    No hay períodos anuales abiertos. Primero debes crear uno.
                  </p>
                ) : (
                  <SearchableSelect
                    options={parentPeriodOptions}
                    value={selectedParentId}
                    onChange={setSelectedParentId}
                    placeholder="Selecciona el período anual"
                    clearable={false}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Mes</Label>
                <SearchableSelect
                  options={MONTHS}
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  placeholder="Selecciona el mes"
                  clearable={false}
                />
              </div>

              {selectedParentId && (
                <p className="text-xs text-muted-foreground">
                  Se creará: <strong>{MONTHS.find(m => m.value === selectedMonth)?.label} {yearForMonthly}</strong>{' '}
                  (01/{String(month).padStart(2, '0')}/{yearForMonthly} - {getLastDayOfMonth(yearForMonthly, month)}/{String(month).padStart(2, '0')}/{yearForMonthly})
                </p>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Notas adicionales..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                (isAnnual && currentYearPeriodExists) ||
                (!isAnnual && openAnnualPeriods.length === 0)
              }
            >
              {loading ? 'Creando...' : 'Crear Período'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
