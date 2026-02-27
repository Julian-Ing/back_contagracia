'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
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
import { commonAreasService } from '@/modules/ph/services/ph.service';
import { useAuthStore } from '@/modules/auth';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import type { PhCondominium } from '@/modules/ph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportCommonAreasModalProps {
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

const BOOL_TRUE_VALUES = ['si', 'sí', 'yes', 'true', '1', 'x', 'verdadero'];

const parseBool = (val: string | null): boolean => {
  if (!val) return false;
  return BOOL_TRUE_VALUES.includes(val.toLowerCase());
};

const DAY_COLUMNS = [
  { key: 'dom', keys: ['dom', 'domingo', 'sunday', 'sun'], dayNum: 0 },
  { key: 'lun', keys: ['lun', 'lunes', 'monday', 'mon'], dayNum: 1 },
  { key: 'mar', keys: ['mar', 'martes', 'tuesday', 'tue'], dayNum: 2 },
  { key: 'mie', keys: ['mie', 'miercoles', 'miércoles', 'wednesday', 'wed'], dayNum: 3 },
  { key: 'jue', keys: ['jue', 'jueves', 'thursday', 'thu'], dayNum: 4 },
  { key: 'vie', keys: ['vie', 'viernes', 'friday', 'fri'], dayNum: 5 },
  { key: 'sab', keys: ['sab', 'sabado', 'sábado', 'saturday', 'sat'], dayNum: 6 },
] as const;

const parseDaysFromColumns = (row: Record<string, unknown>): number[] => {
  const days: number[] = [];
  let anyColumnFound = false;

  for (const col of DAY_COLUMNS) {
    const val = getValue(row, ...col.keys);
    if (val !== null) {
      anyColumnFound = true;
      if (parseBool(val)) {
        days.push(col.dayNum);
      }
    }
  }

  // If no day columns found at all, default to all days
  if (!anyColumnFound) return [0, 1, 2, 3, 4, 5, 6];
  return days.sort();
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportCommonAreasModal({
  open,
  onOpenChange,
  onSuccess,
  condominiums,
}: ImportCommonAreasModalProps) {
  const companyId = useAuthStore((s) => s.company?.id);

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult>({
    total: 0,
    imported: 0,
    failed: 0,
    errors: [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCondominium, setSelectedCondominium] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setFile(null);
      setParsedData([]);
      setProgress(0);
      setSelectedCondominium('');
      setResults({ total: 0, imported: 0, failed: 0, errors: [] });
    }
  }, [open]);

  // ---- Template Download ----

  const downloadTemplate = async () => {
    if (!selectedCondominium) {
      toast.error('Selecciona una copropiedad primero');
      return;
    }

    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const condName =
        condominiums.find((c) => c.id === selectedCondominium)?.name || 'copropiedad';

      const wb = new ExcelJS.Workbook();
      const wsData = wb.addWorksheet('ZonasComunes');

      // Columns
      wsData.columns = [
        { header: 'nombre', key: 'name', width: 25 },
        { header: 'descripcion', key: 'description', width: 35 },
        { header: 'capacidad', key: 'capacity', width: 14 },
        { header: 'tarifa_hora', key: 'rental_fee', width: 16 },
        { header: 'requiere_deposito', key: 'requires_deposit', width: 20 },
        { header: 'monto_deposito', key: 'deposit_amount', width: 18 },
        { header: 'requiere_aprobacion', key: 'requires_approval', width: 22 },
        { header: 'hora_apertura', key: 'available_from', width: 16 },
        { header: 'hora_cierre', key: 'available_to', width: 16 },
        { header: 'min_horas', key: 'min_hours', width: 12 },
        { header: 'max_horas', key: 'max_hours', width: 12 },
        { header: 'dom', key: 'dom', width: 8 },
        { header: 'lun', key: 'lun', width: 8 },
        { header: 'mar', key: 'mar', width: 8 },
        { header: 'mie', key: 'mie', width: 8 },
        { header: 'jue', key: 'jue', width: 8 },
        { header: 'vie', key: 'vie', width: 8 },
        { header: 'sab', key: 'sab', width: 8 },
      ];

      // Example row
      wsData.addRow({
        name: 'Salon Social',
        description: 'Salon comunal para eventos',
        capacity: 50,
        rental_fee: 150000,
        requires_deposit: 'Si',
        deposit_amount: 200000,
        requires_approval: 'Si',
        available_from: '08:00',
        available_to: '22:00',
        min_hours: 2,
        max_hours: 8,
        dom: 'Si',
        lun: 'Si',
        mar: 'Si',
        mie: 'Si',
        jue: 'Si',
        vie: 'Si',
        sab: 'Si',
      });

      // Hidden sheet: Boolean values
      const wsBool = wb.addWorksheet('Booleanos');
      wsBool.addRow(['Si']);
      wsBool.addRow(['No']);
      wsBool.state = 'hidden';

      // Hidden sheet: Hours
      const wsHours = wb.addWorksheet('Horas');
      for (let h = 0; h < 24; h++) {
        for (const m of ['00', '30']) {
          wsHours.addRow([`${String(h).padStart(2, '0')}:${m}`]);
        }
      }
      const hourCount = 48;
      wsHours.state = 'hidden';

      // Data validations (rows 2-1000)
      // Boolean columns: E (requiere_deposito), G (requiere_aprobacion), L-R (dom-sab)
      const boolCols = ['E', 'G', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'];
      for (let row = 2; row <= 1000; row++) {
        for (const col of boolCols) {
          wsData.getCell(`${col}${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['Booleanos!$A$1:$A$2'],
          };
        }

        // hora_apertura dropdown (column H)
        wsData.getCell(`H${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Horas!$A$1:$A$${hourCount}`],
        };

        // hora_cierre dropdown (column I)
        wsData.getCell(`I${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Horas!$A$1:$A$${hourCount}`],
        };
      }

      // Style header
      wsData.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '7C3AED' },
        };
      });

      // Download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const safeName = condName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      saveAs(blob, `plantilla_zonas_comunes_${safeName}.xlsx`);

      toast.success('Plantilla descargada');
    } catch (error: any) {
      console.error('Error generando plantilla:', error);
      toast.error('Error generando la plantilla: ' + error.message);
    }
  };

  // ---- File Upload ----

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Solo se permiten archivos Excel (.xlsx, .xls)');
      event.target.value = '';
      return;
    }

    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      if (jsonData.length === 0) {
        toast.error('El archivo esta vacio');
        return;
      }

      setParsedData(jsonData);
      setStep(2);
      toast.success(`${jsonData.length} filas detectadas`);
    } catch (error: any) {
      toast.error('Error al leer archivo: ' + error.message);
    }
  };

  // ---- Import ----

  const handleImport = async () => {
    if (!companyId || !selectedCondominium) return;

    setImporting(true);
    setStep(3);

    const totalRows = parsedData.length;
    let importedCount = 0;
    let failedCount = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];

      try {
        // Required: name
        const name = getValue(row, 'nombre', 'name', 'Nombre');
        if (!name) throw new Error('Nombre es requerido');

        const description = getValue(row, 'descripcion', 'description', 'Descripcion');
        const capacityRaw = getValue(row, 'capacidad', 'capacity', 'Capacidad');
        const rentalFeeRaw = getValue(row, 'tarifa_hora', 'rental_fee', 'tarifa', 'Tarifa');
        const requiresDeposit = getValue(row, 'requiere_deposito', 'requires_deposit');
        const depositAmountRaw = getValue(row, 'monto_deposito', 'deposit_amount');
        const requiresApproval = getValue(row, 'requiere_aprobacion', 'requires_approval');
        const availableFrom = getValue(row, 'hora_apertura', 'available_from');
        const availableTo = getValue(row, 'hora_cierre', 'available_to');
        const minHoursRaw = getValue(row, 'min_horas', 'min_hours');
        const maxHoursRaw = getValue(row, 'max_horas', 'max_hours');

        const payload: Record<string, unknown> = {
          condominium_id: selectedCondominium,
          name,
        };

        if (description) payload.description = description;

        if (capacityRaw) {
          const cap = Number(capacityRaw);
          if (!isNaN(cap) && cap > 0) payload.capacity = cap;
        }

        if (rentalFeeRaw) {
          const fee = Number(rentalFeeRaw);
          if (!isNaN(fee) && fee >= 0) payload.rental_fee = fee;
        }

        payload.requires_deposit = parseBool(requiresDeposit);

        if (depositAmountRaw) {
          const dep = Number(depositAmountRaw);
          if (!isNaN(dep) && dep >= 0) payload.deposit_amount = dep;
        }

        payload.requires_approval = parseBool(requiresApproval);

        if (availableFrom) payload.available_from = availableFrom;
        if (availableTo) payload.available_to = availableTo;

        if (minHoursRaw) {
          const mh = Number(minHoursRaw);
          if (!isNaN(mh) && mh > 0) payload.min_hours = mh;
        }

        if (maxHoursRaw) {
          const mh = Number(maxHoursRaw);
          if (!isNaN(mh) && mh > 0) payload.max_hours = mh;
        }

        payload.available_days = parseDaysFromColumns(row);

        await commonAreasService.create(companyId, payload);
        importedCount++;
      } catch (rowError: any) {
        failedCount++;
        const msg =
          rowError?.response?.data?.message || rowError?.message || 'Error desconocido';
        errors.push({ row: i + 2, error: msg });
      }

      setProgress(Math.round(((i + 1) / totalRows) * 100));
    }

    setResults({ total: totalRows, imported: importedCount, failed: failedCount, errors });
    setStep(4);
    setImporting(false);

    if (failedCount === 0) {
      toast.success(`${importedCount} zonas comunes importadas`);
    } else {
      toast.error(`${importedCount} importadas, ${failedCount} fallaron`);
    }
  };

  // ---- Close ----

  const handleClose = () => {
    if (results.imported > 0) {
      onSuccess?.();
    }
    onOpenChange(false);
  };

  // ---- Preview columns ----
  const previewCols = [
    'nombre',
    'descripcion',
    'capacidad',
    'tarifa_hora',
    'hora_apertura',
    'hora_cierre',
    'dom',
    'lun',
    'mar',
    'mie',
    'jue',
    'vie',
    'sab',
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Importar Zonas Comunes desde Excel
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            {step === 1 && 'Sube un archivo Excel con zonas comunes'}
            {step === 2 && 'Revisa la vista previa antes de importar'}
            {step === 3 && 'Importando...'}
            {step === 4 && 'Resumen de importacion'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            {/* Info alert */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                La plantilla incluye dropdowns con los valores validos para cada campo.
                Campos requeridos: <strong>nombre</strong>
              </p>
            </div>

            {/* Condominium selector */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-slate-300">Copropiedad *</Label>
              <Select
                options={condominiums.map((c) => ({ value: c.id, label: c.name }))}
                value={selectedCondominium}
                onChange={setSelectedCondominium}
                placeholder="Selecciona una copropiedad"
                searchable
              />
            </div>

            {/* Download template */}
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
              disabled={!selectedCondominium}
              className="w-full gap-2 border-gray-200 dark:border-slate-700"
            >
              <Download className="h-4 w-4" />
              Descargar Plantilla Excel
            </Button>

            {/* File input */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-slate-300">
                Seleccionar archivo Excel
              </Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={!selectedCondominium}
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
              {!selectedCondominium && (
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  Primero selecciona una copropiedad para cargar la plantilla con los datos
                  correctos
                </p>
              )}
              {file && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {file.name} ({parsedData.length} filas)
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {parsedData.length} filas detectadas. Verifica los datos antes de importar.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-slate-700 rounded-lg max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 text-xs text-gray-600 dark:text-slate-300">
                      #
                    </th>
                    {previewCols.map((col) => (
                      <th
                        key={col}
                        className="text-left p-2 text-xs text-gray-600 dark:text-slate-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-gray-200 dark:border-slate-700"
                    >
                      <td className="p-2 text-xs text-gray-400 dark:text-slate-500">
                        {idx + 1}
                      </td>
                      {previewCols.map((col) => (
                        <td
                          key={col}
                          className="p-2 text-xs text-gray-700 dark:text-slate-300"
                        >
                          {getValue(row, col) || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedData.length > 10 && (
                    <tr className="border-t border-gray-200 dark:border-slate-700">
                      <td
                        colSpan={previewCols.length + 1}
                        className="p-2 text-center text-xs text-gray-400 dark:text-slate-500"
                      >
                        ... y {parsedData.length - 10} filas mas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 3: Importing */}
        {step === 3 && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 animate-bounce text-purple-500" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Importando zonas comunes...
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Por favor espera</p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-slate-400">
              {progress}%
            </p>
          </div>
        )}

        {/* STEP 4: Results */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-center bg-emerald-50 dark:bg-emerald-950/30">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                <p className="text-2xl font-bold text-emerald-600">{results.imported}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Importadas</p>
              </div>
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 text-center bg-red-50 dark:bg-red-950/30">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Fallidas</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-950/30 max-h-48 overflow-y-auto">
                <p className="font-medium text-sm mb-2 text-red-800 dark:text-red-300">
                  Errores:
                </p>
                <div className="space-y-1 text-xs">
                  {results.errors.slice(0, 15).map((err, idx) => (
                    <p key={idx} className="text-red-700 dark:text-red-400">
                      Fila {err.row}: {err.error}
                    </p>
                  ))}
                  {results.errors.length > 15 && (
                    <p className="text-red-600 font-medium">
                      ... y {results.errors.length - 15} errores mas
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-200 dark:border-slate-700"
            >
              Cancelar
            </Button>
          )}

          {step === 2 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="border-gray-200 dark:border-slate-700"
              >
                Atras
              </Button>
              <Button type="button" onClick={handleImport}>
                Importar {parsedData.length} Zonas Comunes
              </Button>
            </>
          )}

          {step === 4 && (
            <Button type="button" onClick={handleClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
