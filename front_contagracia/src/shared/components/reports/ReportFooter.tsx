import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface ReportFooterProps {
  /** Fecha/hora de generación. Si no se pasa, usa new Date() */
  generatedAt?: Date;
  className?: string;
}

/**
 * Pie de página estándar para todos los reportes.
 *
 * Muestra: "Este informe se elaboró el {fecha larga}, {hora}"
 *
 * Uso:
 *   <ReportFooter />
 *   <ReportFooter generatedAt={myDate} />
 */
export function ReportFooter({ generatedAt, className }: ReportFooterProps) {
  const date = generatedAt ?? new Date();

  const formatted = date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      className={cn(
        'mt-8 pt-3 border-t border-gray-200 dark:border-gray-700 print:border-gray-300',
        'flex items-center justify-between',
        'text-xs text-gray-400 dark:text-gray-500 print:text-gray-500',
        className,
      )}
    >
      <span>Este informe se elaboró el {formatted}</span>
      <span>Generado por Contagracia</span>
    </div>
  );
}
