import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface ReportDocumentProps {
  /** Contenido del reporte (header, tablas, footer) */
  children: React.ReactNode;
  className?: string;
}

/**
 * Contenedor principal de cualquier reporte imprimible.
 *
 * - Fondo blanco, borde, padding estilo "hoja"
 * - En print: quita bordes/bordes redondeados y aplica tamaño A4
 *
 * Uso:
 *   <ReportDocument>
 *     <ReportHeader ... />
 *     <ReportTable ... />
 *     <ReportFooter />
 *   </ReportDocument>
 */
export function ReportDocument({ children, className }: ReportDocumentProps) {
  return (
    <>
      {/*
       * Print CSS global — técnica "visibility trick":
       *  1. Se oculta TODO el body (visibility: hidden)
       *  2. Solo el #report-document y sus hijos quedan visibles
       *  3. Se posiciona en top-left para llenar la hoja desde el inicio
       * Esto evita que el sidebar/navbar aparezca en el PDF.
       */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }

          /* Ocultar TODO */
          body * {
            visibility: hidden !important;
          }

          /* Solo el reporte es visible */
          #report-document,
          #report-document * {
            visibility: visible !important;
          }

          /* Posicionar en esquina superior izquierda, sin márgenes extra */
          #report-document {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div
        id="report-document"
        className={cn(
          'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800',
          'p-8',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
