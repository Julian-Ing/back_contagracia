'use client';

/**
 * IMPORTANTE: este archivo usa @react-pdf/renderer (PDFDownloadLink).
 * Siempre importarlo con:
 *   dynamic(() => import('...PdfDownloadButton').then(m => ({ default: m.PdfDownloadButton })), { ssr: false })
 */

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface PdfDownloadButtonProps {
  /** Elemento <Document> de @react-pdf/renderer */
  document: React.ReactElement;
  fileName: string;
  label?: string;
  className?: string;
}

export function PdfDownloadButton({
  document,
  fileName,
  label = 'Descargar PDF',
  className,
}: PdfDownloadButtonProps) {
  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }) => (
        <Button variant="outline" disabled={loading} className={`gap-2 ${className ?? ''}`}>
          <Download className="h-4 w-4" />
          {loading ? 'Generando...' : label}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
