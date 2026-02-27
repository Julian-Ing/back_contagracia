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
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { adminClient } from '@/shared/services/api/apiClient';
import { condominiumsService } from '@/modules/ph/services/ph.service';
import { useAuthStore } from '@/modules/auth';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportCondominiumsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportCondominiumsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportCondominiumsModalProps) {
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

  // Catalog data for template dropdowns
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string; department_id: string | number }[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setFile(null);
      setParsedData([]);
      setProgress(0);
      setResults({ total: 0, imported: 0, failed: 0, errors: [] });
      loadCatalogs();
    }
  }, [open]);

  const loadCatalogs = async () => {
    try {
      // 1. Fetch departments
      const deptRes = await adminClient.get('/admin/catalogs/departments');
      const deptRaw = deptRes.data?.data || deptRes.data;
      const depts = (Array.isArray(deptRaw) ? deptRaw : []).map((d: any) => ({
        id: String(d.id),
        name: d.name,
      }));
      setDepartments(depts);

      // 2. Fetch municipalities PER department to guarantee correct grouping
      const allMunis: { id: string; name: string; department_id: string }[] = [];
      const batchSize = 10;
      for (let i = 0; i < depts.length; i += batchSize) {
        const batch = depts.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((dept) =>
            adminClient
              .get(`/admin/catalogs/municipalities/by-department/${dept.id}`)
              .then((res) => {
                const raw = res.data?.data || res.data;
                return (Array.isArray(raw) ? raw : []).map((m: any) => ({
                  id: String(m.id),
                  name: m.name,
                  department_id: dept.id,
                }));
              })
              .catch(() => [] as { id: string; name: string; department_id: string }[]),
          ),
        );
        results.forEach((munis) => allMunis.push(...munis));
      }
      setMunicipalities(allMunis);
    } catch {
      // Silently fail — template will just not have dropdowns
    }
  };

  // ---- Template Download ----

  const downloadTemplate = async () => {
    try {
      // Dynamic import to avoid SSR issues with ExcelJS
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const wb = new ExcelJS.Workbook();
      const wsData = wb.addWorksheet('Copropiedades');

      // Columns
      wsData.columns = [
        { header: 'nombre', key: 'name', width: 30 },
        { header: 'nit', key: 'nit', width: 15 },
        { header: 'direccion', key: 'address', width: 30 },
        { header: 'departamento', key: 'department', width: 20 },
        { header: 'municipio', key: 'municipality', width: 20 },
        { header: 'telefono', key: 'phone', width: 15 },
        { header: 'email', key: 'email', width: 25 },
        { header: 'precio_m2', key: 'price_per_m2', width: 15 },
      ];

      // Example row
      wsData.addRow({
        name: 'Conjunto Residencial Las Torres',
        nit: '900123456-7',
        address: 'Calle 123 # 45-67',
        department: 'Antioquia',
        municipality: 'Medellín',
        phone: '3001234567',
        email: 'admin@conjunto.com',
        price_per_m2: 5000,
      });

      // Hidden sheet: Departments list
      const wsDepartamentos = wb.addWorksheet('Departamentos');
      if (departments.length > 0) {
        departments.forEach((d) => wsDepartamentos.addRow([d.name]));
      } else {
        wsDepartamentos.addRow(['(Sin departamentos)']);
      }
      const deptCount = Math.max(departments.length, 1);

      // Normalize name for Excel sheet names
      const normalizeSheetName = (name: string) =>
        name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents
          .replace(/[^a-zA-Z0-9]/g, '_')   // replace special chars
          .replace(/^(\d)/, '_$1')          // prefix if starts with digit
          .substring(0, 31);

      // Create hidden sheet per department with its municipalities
      departments.forEach((dept) => {
        const sheetName = normalizeSheetName(dept.name);
        const wsMunis = wb.addWorksheet(sheetName);
        const deptMunis = municipalities.filter(
          (m) => String(m.department_id) === dept.id,
        );

        if (deptMunis.length > 0) {
          deptMunis.forEach((m) => wsMunis.addRow([m.name]));
        } else {
          wsMunis.addRow(['(Sin municipios)']);
        }
        wsMunis.state = 'hidden';
      });

      // Data validations for rows 2-1000
      for (let row = 2; row <= 1000; row++) {
        // Department dropdown
        wsData.getCell(`D${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Departamentos!$A$1:$A$${deptCount}`],
        };

        // Municipality dropdown (INDIRECT filtering by department)
        wsData.getCell(`E${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [
            `INDIRECT(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(D${row},"á","a"),"é","e"),"í","i"),"ó","o"),"ú","u")," ","_"),"ñ","n"),"Ñ","N"),".","_")&"!$A:$A")`,
          ],
        };
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

      wsDepartamentos.state = 'hidden';

      // Download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, 'plantilla_copropiedades_ph.xlsx');

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
        toast.error('El archivo está vacío');
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
    if (!companyId) return;

    setImporting(true);
    setStep(3);

    const totalRows = parsedData.length;
    let importedCount = 0;
    let failedCount = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];

      try {
        const name = getValue(row, 'nombre', 'name', 'Nombre');
        if (!name) throw new Error('Nombre es requerido');

        const nit = getValue(row, 'nit', 'NIT');
        const address = getValue(row, 'direccion', 'address', 'Dirección');
        const deptName = getValue(row, 'departamento', 'department', 'Departamento');
        const muniName = getValue(row, 'municipio', 'municipality', 'Municipio');
        const phone = getValue(row, 'telefono', 'phone', 'Teléfono');
        const email = getValue(row, 'email', 'Email');

        // Lookup department & municipality IDs by name
        const dept = deptName
          ? departments.find((d) => d.name.toLowerCase() === deptName.toLowerCase())
          : null;
        const muni = muniName
          ? municipalities.find((m) => m.name.toLowerCase() === muniName.toLowerCase())
          : null;

        const priceM2 = getValue(row, 'precio_m2', 'price_per_m2', 'Precio m2', 'valor_m2');

        const payload: Record<string, unknown> = { name };
        if (nit) payload.nit = nit;
        if (address) payload.address = address;
        if (dept) payload.department_id = dept.id;
        if (muni) payload.municipality_id = muni.id;
        if (phone) payload.phone = phone;
        if (email) payload.email = email;
        if (priceM2) payload.price_per_m2 = Number(priceM2);

        await condominiumsService.create(companyId, payload);
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
      toast.success(`${importedCount} copropiedades importadas`);
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
  const previewCols = ['nombre', 'nit', 'direccion', 'departamento', 'municipio', 'telefono', 'email', 'precio_m2'];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Importar Copropiedades desde Excel
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            {step === 1 && 'Sube un archivo Excel con copropiedades'}
            {step === 2 && 'Revisa la vista previa antes de importar'}
            {step === 3 && 'Importando...'}
            {step === 4 && 'Resumen de importación'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            {/* Info alert */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                La plantilla incluye dropdowns con los valores válidos para cada campo.
                Campos requeridos: <strong>nombre</strong>
              </p>
            </div>

            {/* Download template */}
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
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
                className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
              />
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
                        ... y {parsedData.length - 10} filas más
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
                Importando copropiedades...
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
                      ... y {results.errors.length - 15} errores más
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
                Atrás
              </Button>
              <Button type="button" onClick={handleImport}>
                Importar {parsedData.length} Copropiedades
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
