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
import { vehiclesService } from '@/modules/ph/services/ph.service';
import { useAuthStore } from '@/modules/auth';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import type { PhUnit, PhUnitType, PhCondominium } from '@/modules/ph';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportVehiclesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  condominiums: PhCondominium[];
  units: PhUnit[];
  unitTypes: PhUnitType[];
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

const VEHICLE_TYPES = ['car', 'motorcycle', 'bicycle', 'other'] as const;
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Carro',
  motorcycle: 'Moto',
  bicycle: 'Bicicleta',
  other: 'Otro',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportVehiclesModal({
  open,
  onOpenChange,
  onSuccess,
  condominiums,
  units,
  unitTypes,
}: ImportVehiclesModalProps) {
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

  // Condominium filter for template
  const [selectedCondominium, setSelectedCondominium] = useState('');

  // Computed: units for selected condominium
  const condominiumUnits = selectedCondominium
    ? units.filter((u) => u.condominium_id === selectedCondominium && u.is_active)
    : [];

  // Parking units (is_parking type)
  const parkingTypeIds = new Set(
    unitTypes.filter((ut) => ut.is_parking).map((ut) => ut.id),
  );
  const parkingUnits = condominiumUnits.filter(
    (u) => u.unit_type_id && parkingTypeIds.has(u.unit_type_id),
  );
  const nonParkingUnits = condominiumUnits.filter(
    (u) => !u.unit_type_id || !parkingTypeIds.has(u.unit_type_id),
  );

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
      const wsData = wb.addWorksheet('Vehiculos');

      // Columns
      wsData.columns = [
        { header: 'unidad', key: 'unit_number', width: 20 },
        { header: 'placa', key: 'plate', width: 15 },
        { header: 'tipo_vehiculo', key: 'vehicle_type', width: 18 },
        { header: 'marca', key: 'brand', width: 18 },
        { header: 'modelo', key: 'model', width: 18 },
        { header: 'ano', key: 'year', width: 10 },
        { header: 'color', key: 'color', width: 15 },
        { header: 'sticker', key: 'sticker_number', width: 15 },
        { header: 'parqueadero', key: 'parking_space', width: 20 },
        { header: 'notas', key: 'notes', width: 30 },
      ];

      // Example row
      wsData.addRow({
        unit_number: nonParkingUnits[0]?.unit_number || 'A-101',
        plate: 'ABC123',
        vehicle_type: 'car',
        brand: 'Chevrolet',
        model: 'Spark GT',
        year: 2023,
        color: 'Blanco',
        sticker_number: '001',
        parking_space: parkingUnits[0]?.unit_number || '',
        notes: '',
      });

      // Hidden sheet: Units (non-parking)
      const wsUnits = wb.addWorksheet('Unidades');
      nonParkingUnits.forEach((u) => wsUnits.addRow([u.unit_number]));
      if (nonParkingUnits.length === 0) wsUnits.addRow(['(Sin unidades)']);
      const unitCount = Math.max(nonParkingUnits.length, 1);
      wsUnits.state = 'hidden';

      // Hidden sheet: Vehicle types
      const wsTypes = wb.addWorksheet('TiposVehiculo');
      VEHICLE_TYPES.forEach((t) => wsTypes.addRow([t]));
      wsTypes.state = 'hidden';

      // Hidden sheet: Parking spaces
      const wsParking = wb.addWorksheet('Parqueaderos');
      if (parkingUnits.length > 0) {
        parkingUnits.forEach((u) => wsParking.addRow([u.unit_number]));
      } else {
        wsParking.addRow(['(Sin parqueaderos)']);
      }
      const parkingCount = Math.max(parkingUnits.length, 1);
      wsParking.state = 'hidden';

      // Data validations (rows 2-1000)
      for (let row = 2; row <= 1000; row++) {
        // Unit dropdown (column A)
        wsData.getCell(`A${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`Unidades!$A$1:$A$${unitCount}`],
        };

        // Vehicle type dropdown (column C)
        wsData.getCell(`C${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`TiposVehiculo!$A$1:$A$${VEHICLE_TYPES.length}`],
        };

        // Parking dropdown (column I)
        if (parkingUnits.length > 0) {
          wsData.getCell(`I${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Parqueaderos!$A$1:$A$${parkingCount}`],
          };
        }
      }

      // Style header
      wsData.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' },
        };
      });

      // Download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const safeName = condName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      saveAs(blob, `plantilla_vehiculos_${safeName}.xlsx`);

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

    // Build lookup maps
    const unitByNumber = new Map(
      condominiumUnits.map((u) => [u.unit_number.toLowerCase(), u]),
    );

    const totalRows = parsedData.length;
    let importedCount = 0;
    let failedCount = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];

      try {
        // Required: unit_number
        const unitNumber = getValue(row, 'unidad', 'unit_number', 'Unidad');
        if (!unitNumber) throw new Error('Unidad es requerida');

        const unit = unitByNumber.get(unitNumber.toLowerCase());
        if (!unit) throw new Error(`Unidad "${unitNumber}" no encontrada en esta copropiedad`);

        // Required: plate
        const plate = getValue(row, 'placa', 'plate', 'Placa');
        if (!plate) throw new Error('Placa es requerida');

        // Vehicle type
        const vehicleType = getValue(row, 'tipo_vehiculo', 'vehicle_type', 'tipo', 'Tipo');
        if (!vehicleType || !VEHICLE_TYPES.includes(vehicleType as any)) {
          throw new Error(
            `Tipo de vehiculo invalido: "${vehicleType}". Valores validos: ${VEHICLE_TYPES.join(', ')}`,
          );
        }

        const brand = getValue(row, 'marca', 'brand', 'Marca');
        const model = getValue(row, 'modelo', 'model', 'Modelo');
        const yearRaw = getValue(row, 'ano', 'year', 'Ano', 'año');
        const color = getValue(row, 'color', 'Color');
        const sticker = getValue(row, 'sticker', 'sticker_number', 'Sticker');
        const parking = getValue(row, 'parqueadero', 'parking_space', 'Parqueadero');
        const notes = getValue(row, 'notas', 'notes', 'Notas');

        const payload: Record<string, unknown> = {
          unit_id: unit.id,
          vehicle_type: vehicleType,
          plate: plate.toUpperCase(),
        };
        if (brand) payload.brand = brand;
        if (model) payload.model = model;
        if (yearRaw) {
          const yr = Number(yearRaw);
          if (!isNaN(yr) && yr >= 1900) payload.year = yr;
        }
        if (color) payload.color = color;
        if (sticker) payload.sticker_number = sticker;
        if (parking) payload.parking_space = parking;
        if (notes) payload.notes = notes;

        await vehiclesService.create(companyId, payload);
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
      toast.success(`${importedCount} vehiculos importados`);
    } else {
      toast.error(`${importedCount} importados, ${failedCount} fallaron`);
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
    'unidad',
    'placa',
    'tipo_vehiculo',
    'marca',
    'modelo',
    'ano',
    'color',
    'parqueadero',
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Importar Vehiculos desde Excel
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            {step === 1 && 'Sube un archivo Excel con vehiculos'}
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
                Campos requeridos: <strong>unidad</strong>, <strong>placa</strong>,{' '}
                <strong>tipo_vehiculo</strong>
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
              <Upload className="h-12 w-12 mx-auto mb-4 animate-bounce text-blue-500" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Importando vehiculos...
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Por favor espera</p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
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
                <p className="text-sm text-gray-500 dark:text-slate-400">Importados</p>
              </div>
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 text-center bg-red-50 dark:bg-red-950/30">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Fallidos</p>
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
                Importar {parsedData.length} Vehiculos
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
