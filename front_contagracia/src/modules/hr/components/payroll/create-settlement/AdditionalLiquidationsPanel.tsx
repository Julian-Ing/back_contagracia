'use client';

import { Label } from '@/shared/components/ui/label';
import type { CreateSettlementDto } from '../../../types';

interface AdditionalLiquidationsPanelProps {
  form: CreateSettlementDto;
  onUpdate: <K extends keyof CreateSettlementDto>(key: K, value: CreateSettlementDto[K]) => void;
}

const LIQUIDATION_OPTIONS = [
  { key: 'liquidate_prima' as const, label: 'Prima de Servicios', description: 'Liquida prima semestral' },
  { key: 'liquidate_cesantias' as const, label: 'Cesantias', description: 'Liquida cesantias anuales' },
  { key: 'liquidate_cesantias_interest' as const, label: 'Intereses Cesantias', description: 'Liquida intereses sobre cesantias' },
  { key: 'liquidate_vacaciones' as const, label: 'Vacaciones', description: 'Liquida vacaciones acumuladas' },
] as const;

type LiquidationKey = typeof LIQUIDATION_OPTIONS[number]['key'];

const ALL_KEYS: LiquidationKey[] = LIQUIDATION_OPTIONS.map((o) => o.key);

export function AdditionalLiquidationsPanel({ form, onUpdate }: AdditionalLiquidationsPanelProps) {
  const selectedKey = ALL_KEYS.find((k) => !!form[k]) ?? null;

  const handleSelect = (key: LiquidationKey) => {
    // Si ya está seleccionado, deseleccionar (toggle off)
    const isCurrentlySelected = !!form[key];

    // Desactivar todas primero
    for (const k of ALL_KEYS) {
      if (form[k]) onUpdate(k, false);
    }

    // Si no estaba seleccionado, activar el nuevo
    if (!isCurrentlySelected) {
      onUpdate(key, true);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
      <Label className="text-sm font-medium mb-1 block">Liquidacion Adicional</Label>
      <p className="text-xs text-muted-foreground mb-3">
        Solo se puede incluir una liquidacion adicional por periodo. Opcional.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {LIQUIDATION_OPTIONS.map(({ key, label, description }) => {
          const isSelected = selectedKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'border-indigo-500'
                    : 'border-gray-400 dark:border-gray-500'
                }`}>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  )}
                </div>
                <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
