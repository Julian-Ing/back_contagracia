'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Settings, Users, Eye } from 'lucide-react';

export type WizardStep = 'basic_info' | 'employee_management' | 'preview';

interface StepDef {
  key: WizardStep;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}

const STEPS: StepDef[] = [
  { key: 'basic_info', label: 'Informacion Basica', shortLabel: 'Info', icon: Settings },
  { key: 'employee_management', label: 'Gestion de Empleados y Calculos', shortLabel: 'Empleados', icon: Users },
  { key: 'preview', label: 'Vista Previa y Finalizacion', shortLabel: 'Finalizar', icon: Eye },
];

interface WizardStepIndicatorProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  hasSettlement: boolean;
  hasEmployees: boolean;
  hasCalculatedEmployees: boolean;
}

export function WizardStepIndicator({
  currentStep,
  onStepClick,
  hasSettlement,
  hasEmployees,
  hasCalculatedEmployees,
}: WizardStepIndicatorProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between overflow-x-auto">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isCompleted =
              (step.key === 'basic_info' && hasSettlement) ||
              (step.key === 'employee_management' && hasEmployees && hasCalculatedEmployees) ||
              (step.key === 'preview' && hasCalculatedEmployees);
            const isEnabled =
              step.key === 'basic_info' ||
              (step.key === 'employee_management' && hasSettlement) ||
              (step.key === 'preview' && hasCalculatedEmployees);

            return (
              <div key={step.key} className="flex items-center">
                <button
                  type="button"
                  onClick={() => isEnabled && onStepClick(step.key)}
                  disabled={!isEnabled}
                  className={`flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                      : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : isEnabled
                          ? 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                          : 'text-muted-foreground/40 cursor-not-allowed'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                  <span className="sm:hidden text-xs font-medium">{step.shortLabel}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-4 md:w-12 h-px mx-1 md:mx-2 flex-shrink-0 ${
                      isCompleted ? 'bg-green-300 dark:bg-green-700' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
