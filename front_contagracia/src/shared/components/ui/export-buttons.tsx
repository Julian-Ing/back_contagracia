'use client';

import { Button } from '@/shared/components/ui/button';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';

interface ExportButtonsProps {
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  permission?: string;
  loadingPdf?: boolean;
  loadingExcel?: boolean;
}

export function ExportButtons({
  onExportPdf,
  onExportExcel,
  permission,
  loadingPdf,
  loadingExcel,
}: ExportButtonsProps) {
  const { can } = usePermissions();

  if (permission && !can(permission)) return null;

  return (
    <>
      {onExportPdf !== undefined && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPdf}
          disabled={loadingPdf || !onExportPdf}
        >
          {loadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
          PDF
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onExportExcel}
        disabled={loadingExcel || !onExportExcel}
        title={!onExportExcel ? 'Próximamente' : undefined}
      >
        {loadingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
        Excel
      </Button>
    </>
  );
}
