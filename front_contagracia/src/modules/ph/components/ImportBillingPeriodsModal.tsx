'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { billingPeriodsService } from '@/modules/ph/services/ph.service';
import { useAuthStore } from '@/modules/auth';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import type { PhCondominium } from '@/modules/ph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportBillingPeriodsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  condominiums: PhCondominium[];
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getValue = (row: Record<string, unknown>, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim();
    }
  }
  return null;
};

const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

const MONTH_NAME_TO_NUM: Record<string, number> = {};
for (const [num, name] of Object.entries(MONTH_NAMES)) {
  MONTH_NAME_TO_NUM[name.toLowerCase()] = Number(num);
}

const parseMonth = (val: string): number | null => {
  const num = Number(val);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  const lower = val.toLowerCase();
  if (MONTH_NAME_TO_NUM[lower]) return MONTH_NAME_TO_NUM[lower];
  // Try partial match (ene, feb, etc.)
  for (const [name, n] of Object.entries(MONTH_NAME_TO_NUM)) {
    if (name.startsWith(lower)) return n;
  }
  return null;
};

/**
 * Excel stores dates as serial numbers (days since 1899-12-30).
 * Convert to yyyy-MM-dd string.
 */
const excelSerialToDate = (serial: number): string => {
  const utcDays = Math.floor(serial - 25569);
  const d = new Date(utcDays * 86400 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Parse a date value that could be:
 * - Excel serial number (46096)
 * - Date string (2026-04-15, 15/04/2026, etc.)
 * Returns yyyy-MM-dd or null.
 */
const parseDateValue = (val: string): string | null => {
  if (!val) return null;

  // If it's a pure number → Excel serial date
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 100000) {
    return excelSerialToDate(num);
  }

  // Try ISO format (yyyy-MM-dd)
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.split('T')[0];
  }

  // Try dd/MM/yyyy or dd-MM-yyyy
  const dmy = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // Fallback: try native Date parse
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportBillingPeriodsModal({
  open,
  onOpenChange,
  onSuccess,
  condominiums,
}: ImportBillingPeriodsModalProps) {
  const companyId = useAuthStore((s) => s.company?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [selectedCondominium, setSelectedCondominium] = useState('');
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  // ---- Reset ----
  const resetState = () => {
    setStep('upload');
    setSelectedCondominium('');
    setParsedData([]);
    setFileName('');
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // ---- Download Template ----
  const handleDownloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');

    const wb = new ExcelJS.Workbook();

    // Main data sheet
    const wsData = wb.addWorksheet('Periodos');

    // Header row styling
    wsData.columns = [
      { header: 'año', key: 'year', width: 10 },
      { header: 'mes', key: 'month', width: 14 },
      { header: 'nombre', key: 'name', width: 30 },
      { header: 'fecha_vencimiento', key: 'due_date', width: 20 },
      { header: 'notas', key: 'notes', width: 30 },
    ];

    // Style header
    const headerRow = wsData.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }, // emerald-500 for billing
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // Example row
    wsData.addRow({
      year: new Date().getFullYear(),
      month: 'Enero',
      name: `Facturacion Enero ${new Date().getFullYear()}`,
      due_date: '2026-01-15',
      notes: 'Cuota ordinaria',
    });

    // Hidden sheet: Month values
    const wsMonths = wb.addWorksheet('Meses');
    for (let m = 1; m <= 12; m++) {
      wsMonths.addRow([MONTH_NAMES[m]]);
    }
    wsMonths.state = 'hidden';

    // Data validations (rows 2-1000)
    for (let row = 2; row <= 1000; row++) {
      // Mes dropdown (column B)
      wsData.getCell(`B${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['Meses!$A$1:$A$12'],
      };
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'plantilla_periodos_facturacion.xlsx');
    toast.success('Plantilla descargada');
  };

  // ---- File Upload ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
      });

      if (jsonData.length === 0) {
        toast.error('El archivo no contiene datos');
        return;
      }

      setParsedData(jsonData);
      setStep('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  // ---- Import ----
  const handleImport = async () => {
    if (!companyId || !selectedCondominium || parsedData.length === 0) return;

    setStep('importing');
    setImportProgress(0);

    let importedCount = 0;
    let failedCount = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      setImportProgress(Math.round(((i + 1) / parsedData.length) * 100));

      try {
        // Parse year
        const yearRaw = getValue(row, 'año', 'ano', 'year', 'Año', 'Ano');
        if (!yearRaw) {
          throw new Error('El campo "año" es obligatorio');
        }
        const year = Number(yearRaw);
        if (isNaN(year) || year < 2000 || year > 2100) {
          throw new Error(`Año invalido: ${yearRaw}`);
        }

        // Parse month
        const monthRaw = getValue(row, 'mes', 'month', 'Mes');
        if (!monthRaw) {
          throw new Error('El campo "mes" es obligatorio');
        }
        const month = parseMonth(monthRaw);
        if (!month) {
          throw new Error(`Mes invalido: ${monthRaw}. Use numero (1-12) o nombre (Enero, Febrero...)`);
        }

        // Name: use provided or auto-generate
        const nameRaw = getValue(row, 'nombre', 'name', 'Nombre');
        const name = nameRaw || `Facturacion ${MONTH_NAMES[month]} ${year}`;

        // Due date
        const dueDateRaw = getValue(row, 'fecha_vencimiento', 'due_date', 'vencimiento', 'Fecha Vencimiento');

        // Notes
        const notesRaw = getValue(row, 'notas', 'notes', 'Notas');

        const payload: Record<string, unknown> = {
          condominium_id: selectedCondominium,
          name,
          year,
          month,
        };

        if (dueDateRaw) {
          const parsed = parseDateValue(dueDateRaw);
          if (parsed) {
            payload.due_date = parsed;
          }
        }

        if (notesRaw) payload.notes = notesRaw;

        await billingPeriodsService.create(companyId, payload);
        importedCount++;
      } catch (rowError: any) {
        failedCount++;
        const msg =
          rowError?.response?.data?.message || rowError?.message || 'Error desconocido';
        errors.push({ row: i + 2, error: msg });
      }
    }

    const result: ImportResult = {
      total: parsedData.length,
      imported: importedCount,
      failed: failedCount,
      errors,
    };

    setImportResult(result);
    setStep('results');

    if (importedCount > 0) {
      toast.success(`${importedCount} periodo(s) importado(s) exitosamente`);
      onSuccess?.();
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} fila(s) con errores`);
    }
  };

  // ---- Condominium options ----
  const condominiumOptions = condominiums.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // ---- Preview columns ----
  const previewCols = ['año', 'mes', 'nombre', 'fecha_vencimiento', 'notas'];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Importar Periodos de Facturacion desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con periodos de facturacion
          </DialogDescription>
        </DialogHeader>

        {/* ─── Step: Upload ─── */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              La plantilla incluye dropdowns con los valores validos para cada campo.
              Campos requeridos: <strong>año</strong>, <strong>mes</strong>
              {' '}(el nombre se auto-genera si no se proporciona).
            </p>

            <div className="grid gap-2">
              <Label>Copropiedad *</Label>
              <Select
                options={condominiumOptions}
                value={selectedCondominium}
                onChange={setSelectedCondominium}
                placeholder="Selecciona una copropiedad"
                searchable
              />
            </div>

            {selectedCondominium && (
              <>
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar Plantilla Excel
                </Button>

                <div className="grid gap-2">
                  <Label>Seleccionar archivo Excel</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/20 dark:file:text-emerald-400"
                  />
                  {fileName && (
                    <p className="text-xs text-muted-foreground">{fileName}</p>
                  )}
                </div>
              </>
            )}

            {!selectedCondominium && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Primero selecciona una copropiedad para cargar la plantilla con los datos correctos
              </p>
            )}
          </div>
        )}

        {/* ─── Step: Preview ─── */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Vista previa ({parsedData.length} filas)
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                Volver
              </Button>
            </div>

            <div className="border rounded-lg overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">#</th>
                    {previewCols.map((col) => (
                      <th key={col} className="px-2 py-1.5 text-left font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1 text-muted-foreground">{i + 2}</td>
                      {previewCols.map((col) => {
                        const possibleKeys: Record<string, string[]> = {
                          'año': ['año', 'ano', 'year', 'Año', 'Ano'],
                          'mes': ['mes', 'month', 'Mes'],
                          'nombre': ['nombre', 'name', 'Nombre'],
                          'fecha_vencimiento': ['fecha_vencimiento', 'due_date', 'vencimiento'],
                          'notas': ['notas', 'notes', 'Notas'],
                        };
                        let val = getValue(row, ...(possibleKeys[col] || [col]));
                        // Format date columns for display
                        if (col === 'fecha_vencimiento' && val) {
                          val = parseDateValue(val) || val;
                        }
                        return (
                          <td key={col} className="px-2 py-1 max-w-[120px] truncate">
                            {val || <span className="text-muted-foreground/50">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedData.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 10 de {parsedData.length} filas
              </p>
            )}
          </div>
        )}

        {/* ─── Step: Importing ─── */}
        {step === 'importing' && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-8 w-8 text-emerald-500 animate-bounce" />
              <p className="text-sm font-medium">Importando periodos...</p>
              <div className="w-full max-w-xs bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{importProgress}%</p>
            </div>
          </div>
        )}

        {/* ─── Step: Results ─── */}
        {step === 'results' && importResult && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{importResult.total}</p>
                <p className="text-xs text-muted-foreground">Total filas</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {importResult.imported}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Importados</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center justify-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {importResult.failed}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">Fallidos</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 dark:bg-red-900/10 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Fila</th>
                      <th className="px-2 py-1.5 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((err, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1 text-muted-foreground">{err.row}</td>
                        <td className="px-2 py-1 text-red-600 dark:text-red-400">
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{err.error}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Volver
              </Button>
              <Button onClick={handleImport} className="bg-emerald-600 hover:bg-emerald-700">
                <Upload className="h-4 w-4 mr-2" />
                Importar {parsedData.length} fila(s)
              </Button>
            </>
          )}
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          {step === 'results' && (
            <Button type="button" onClick={handleClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
