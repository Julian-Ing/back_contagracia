'use client';

import { Briefcase, Gift, Landmark, Palmtree, UserX } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import type { SettlementType } from '../../../types';

interface SettlementTypeSelectorProps {
  value: SettlementType;
  onChange: (type: SettlementType) => void;
}

const SETTLEMENT_TYPES: {
  type: SettlementType;
  label: string;
  description: string;
  icon: typeof Briefcase;
  color: string;
  selectedBg: string;
}[] = [
  {
    type: 'REGULAR',
    label: 'Nomina Regular',
    description: 'Liquidacion mensual con todos los conceptos',
    icon: Briefcase,
    color: 'text-blue-600 dark:text-blue-400',
    selectedBg: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40',
  },
  {
    type: 'PRIMA',
    label: 'Prima de Servicios',
    description: 'Prima semestral (enero-junio o julio-diciembre)',
    icon: Gift,
    color: 'text-amber-600 dark:text-amber-400',
    selectedBg: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40',
  },
  {
    type: 'CESANTIAS',
    label: 'Cesantias e Intereses',
    description: '1 mes por ano + intereses 12% anual',
    icon: Landmark,
    color: 'text-purple-600 dark:text-purple-400',
    selectedBg: 'border-purple-500 bg-purple-50 dark:bg-purple-950/40',
  },
  {
    type: 'VACACIONES',
    label: 'Vacaciones',
    description: 'Vacaciones acumuladas segun permisos aprobados',
    icon: Palmtree,
    color: 'text-green-600 dark:text-green-400',
    selectedBg: 'border-green-500 bg-green-50 dark:bg-green-950/40',
  },
  {
    type: 'TERMINACION',
    label: 'Terminacion de Contrato',
    description: 'Liquidacion final con todas las prestaciones pendientes',
    icon: UserX,
    color: 'text-red-600 dark:text-red-400',
    selectedBg: 'border-red-500 bg-red-50 dark:bg-red-950/40',
  },
];

export function SettlementTypeSelector({ value, onChange }: SettlementTypeSelectorProps) {
  return (
    <div>
      <Label className="mb-2 block">Tipo de Liquidacion *</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SETTLEMENT_TYPES.map(({ type, label, description, icon: Icon, color, selectedBg }) => {
          const isSelected = value === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? selectedBg
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className={`mt-0.5 shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
