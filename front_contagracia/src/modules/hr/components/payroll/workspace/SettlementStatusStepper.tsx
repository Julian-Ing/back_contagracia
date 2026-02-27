'use client';

import { FileEdit, Calculator, CheckCircle, DollarSign, XCircle } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { SettlementStatus } from '../../../types';

const STEPS = [
  { key: 'DRAFT', label: 'Borrador', Icon: FileEdit },
  { key: 'CALCULATED', label: 'Calculada', Icon: Calculator },
  { key: 'APPROVED', label: 'Aprobada', Icon: CheckCircle },
  { key: 'PAID', label: 'Pagada', Icon: DollarSign },
] as const;

const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  CALCULATED: 1,
  APPROVED: 2,
  PAID: 3,
};

interface SettlementStatusStepperProps {
  status: SettlementStatus;
}

export function SettlementStatusStepper({ status }: SettlementStatusStepperProps) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center justify-center py-3">
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-4 py-1.5 text-sm">
          <XCircle className="h-4 w-4 mr-2" />
          Liquidacion Anulada
        </Badge>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER[status] ?? 0;

  return (
    <div className="flex items-center justify-center py-3">
      <div className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const { Icon } = step;

          return (
            <div key={step.key} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex items-center justify-center w-9 h-9 rounded-full transition-all
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900' : ''}
                    ${isFuture ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${
                    isCompleted ? 'text-green-600 dark:text-green-400' :
                    isCurrent ? 'text-indigo-600 dark:text-indigo-400' :
                    'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 mt-[-16px] ${
                    index < currentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
