'use client';

import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { PAYROLL_TOOLTIPS, type PayrollTooltipInfo } from '../../constants/payroll-tooltips';

interface PayrollTooltipProps {
  conceptKey: string;
  color?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  iconSize?: string;
}

/**
 * Tooltip reutilizable para conceptos de nomina.
 * Busca la info en PAYROLL_TOOLTIPS por key y renderiza un tooltip con formato colombiano.
 */
export function PayrollTooltip({
  conceptKey,
  color = 'bg-blue-600',
  side = 'bottom',
  iconSize = 'h-3.5 w-3.5',
}: PayrollTooltipProps) {
  const info = PAYROLL_TOOLTIPS[conceptKey];
  if (!info) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle
          className={`${iconSize} text-muted-foreground cursor-help inline-block ml-1 flex-shrink-0`}
        />
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs p-0 border-0 shadow-xl z-50">
        <PayrollTooltipCard info={info} color={color} />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Tooltip con info personalizada (sin usar PAYROLL_TOOLTIPS).
 */
export function PayrollTooltipCustom({
  info,
  color = 'bg-blue-600',
  side = 'bottom',
  iconSize = 'h-3.5 w-3.5',
}: {
  info: PayrollTooltipInfo;
  color?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  iconSize?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle
          className={`${iconSize} text-muted-foreground cursor-help inline-block ml-1 flex-shrink-0`}
        />
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs p-0 border-0 shadow-xl z-50">
        <PayrollTooltipCard info={info} color={color} />
      </TooltipContent>
    </Tooltip>
  );
}

function PayrollTooltipCard({ info, color }: { info: PayrollTooltipInfo; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`${color} px-3 py-1.5`}>
        <span className="text-xs font-semibold text-white block">{info.title}</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {info.description && (
          <span className="text-xs text-gray-700 dark:text-gray-300 block">{info.description}</span>
        )}
        {info.formula && (
          <span className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 block">
            {info.formula}
          </span>
        )}
        {info.note && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 block">{info.note}</span>
        )}
        {info.legalRef && (
          <span className="text-[10px] text-muted-foreground italic block">{info.legalRef}</span>
        )}
      </div>
    </div>
  );
}
