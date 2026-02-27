'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
  Copy,
  Search,
} from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  ExogenousForm,
  type ExogenousFormat,
  type ExogenousConcept,
} from '@/modules/admin';

// Mock data
const MOCK_FORMATS: ExogenousFormat[] = [
  { id: '1', code: '1001', year: 2024, name: 'Pagos o abonos en cuenta y retenciones practicadas' },
  { id: '2', code: '1003', year: 2024, name: 'Retenciones en la fuente que le practicaron' },
  { id: '3', code: '1005', year: 2024, name: 'IVA descontable' },
  { id: '4', code: '1006', year: 2024, name: 'IVA generado' },
  { id: '5', code: '1007', year: 2024, name: 'Ingresos recibidos' },
  { id: '6', code: '1008', year: 2024, name: 'Saldos de cuentas por cobrar' },
  { id: '7', code: '1009', year: 2024, name: 'Saldos de cuentas por pagar' },
  { id: '8', code: '1001', year: 2023, name: 'Pagos o abonos en cuenta y retenciones practicadas' },
  { id: '9', code: '1003', year: 2023, name: 'Retenciones en la fuente que le practicaron' },
];

const MOCK_CONCEPTS: Record<string, ExogenousConcept[]> = {
  '1': [
    { id: 'c1', exogenous_format_id: '1', code: '5001', name: 'Salarios y pagos laborales', account_code: '510506', account_name: 'Sueldos' },
    { id: 'c2', exogenous_format_id: '1', code: '5002', name: 'Honorarios', account_code: '511005', account_name: 'Honorarios' },
    { id: 'c3', exogenous_format_id: '1', code: '5003', name: 'Comisiones', account_code: '511010', account_name: 'Comisiones' },
    { id: 'c4', exogenous_format_id: '1', code: '5004', name: 'Servicios', account_code: '511095', account_name: 'Servicios' },
    { id: 'c5', exogenous_format_id: '1', code: '5005', name: 'Arrendamientos', account_code: '512010', account_name: 'Arrendamientos' },
  ],
  '2': [
    { id: 'c6', exogenous_format_id: '2', code: '1301', name: 'Retención en la fuente a título de renta', account_code: '236505', account_name: 'Retención' },
    { id: 'c7', exogenous_format_id: '2', code: '1302', name: 'Retención en la fuente a título de IVA', account_code: '236540', account_name: 'Retención IVA' },
  ],
  '5': [
    { id: 'c8', exogenous_format_id: '5', code: '4001', name: 'Venta de bienes', account_code: '413505', account_name: 'Comercio' },
    { id: 'c9', exogenous_format_id: '5', code: '4002', name: 'Prestación de servicios', account_code: '415005', account_name: 'Servicios' },
  ],
};

export default function ExogenousPage() {
  const [formats, setFormats] = useState<ExogenousFormat[]>([]);
  const [allFormats, setAllFormats] = useState<ExogenousFormat[]>([]);
  const [formatConcepts, setFormatConcepts] = useState<Record<string, ExogenousConcept[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [formatCodeQuery, setFormatCodeQuery] = useState('');
  const [formatNameQuery, setFormatNameQuery] = useState('');
  const [expandedFormat, setExpandedFormat] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<ExogenousFormat | null>(null);
  const [editingConcept, setEditingConcept] = useState<ExogenousConcept | null>(null);
  const [editingType, setEditingType] = useState<'format' | 'concept'>('format');
  const [currentFormatForConcept, setCurrentFormatForConcept] = useState<string | null>(null);

  // Copy dialog
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState('');
  const [copyTargetYear, setCopyTargetYear] = useState('');
  const [copying, setCopying] = useState(false);

  const fetchFormats = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setAllFormats(MOCK_FORMATS);
    setFormats(MOCK_FORMATS);
    const years = [...new Set(MOCK_FORMATS.map((f) => f.year))].sort((a, b) => b - a);
    setAvailableYears(years);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFormats();
  }, [fetchFormats]);

  // Filter formats
  useEffect(() => {
    let filtered = filterYear === 'all' ? allFormats : allFormats.filter((f) => f.year === parseInt(filterYear));
    const codeQ = formatCodeQuery.trim().toLowerCase();
    const nameQ = formatNameQuery.trim().toLowerCase();
    filtered = filtered.filter((f) => {
      const okCode = codeQ ? f.code.toLowerCase().includes(codeQ) : true;
      const okName = nameQ ? f.name.toLowerCase().includes(nameQ) : true;
      return okCode && okName;
    });
    setFormats(filtered);
  }, [filterYear, allFormats, formatCodeQuery, formatNameQuery]);

  const loadConceptsForFormat = async (formatId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    setFormatConcepts((prev) => ({
      ...prev,
      [formatId]: MOCK_CONCEPTS[formatId] || [],
    }));
  };

  const toggleFormat = async (formatId: string) => {
    if (expandedFormat === formatId) {
      setExpandedFormat(null);
    } else {
      setExpandedFormat(formatId);
      if (!formatConcepts[formatId]) {
        await loadConceptsForFormat(formatId);
      }
    }
  };

  const handleNewFormat = () => {
    setEditingFormat(null);
    setEditingConcept(null);
    setEditingType('format');
    setIsFormOpen(true);
  };

  const handleEditFormat = (format: ExogenousFormat) => {
    setEditingFormat(format);
    setEditingConcept(null);
    setEditingType('format');
    setIsFormOpen(true);
  };

  const handleNewConcept = (formatId: string) => {
    setEditingConcept(null);
    setEditingFormat(null);
    setCurrentFormatForConcept(formatId);
    setEditingType('concept');
    setIsFormOpen(true);
  };

  const handleEditConcept = (concept: ExogenousConcept, formatId: string) => {
    setEditingConcept(concept);
    setEditingFormat(null);
    setCurrentFormatForConcept(formatId);
    setEditingType('concept');
    setIsFormOpen(true);
  };

  const handleSaveFormat = async (data: Partial<ExogenousFormat>) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (editingFormat) {
      setAllFormats((prev) =>
        prev.map((f) => (f.id === editingFormat.id ? { ...f, ...data } as ExogenousFormat : f))
      );
    } else {
      const newFormat: ExogenousFormat = {
        id: Date.now().toString(),
        code: data.code || '',
        year: data.year || new Date().getFullYear(),
        name: data.name || '',
      };
      setAllFormats((prev) => [newFormat, ...prev]);
    }
    setIsFormOpen(false);
    setEditingFormat(null);
    setSaving(false);
  };

  const handleSaveConcept = async (data: Partial<ExogenousConcept>) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (currentFormatForConcept) {
      if (editingConcept) {
        setFormatConcepts((prev) => ({
          ...prev,
          [currentFormatForConcept]: (prev[currentFormatForConcept] || []).map((c) =>
            c.id === editingConcept.id ? { ...c, ...data } as ExogenousConcept : c
          ),
        }));
      } else {
        const newConcept: ExogenousConcept = {
          id: Date.now().toString(),
          exogenous_format_id: currentFormatForConcept,
          code: data.code || '',
          name: data.name || '',
          account_code: data.account_code,
          account_name: data.account_name,
        };
        setFormatConcepts((prev) => ({
          ...prev,
          [currentFormatForConcept]: [...(prev[currentFormatForConcept] || []), newConcept],
        }));
      }
    }
    setIsFormOpen(false);
    setEditingConcept(null);
    setCurrentFormatForConcept(null);
    setSaving(false);
  };

  const handleCopyFormats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copySourceYear || !copyTargetYear) return;
    setCopying(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Mock copy - in real app this would call an API
    const sourceFormats = allFormats.filter((f) => f.year === parseInt(copySourceYear));
    const newFormats = sourceFormats.map((f) => ({
      ...f,
      id: Date.now().toString() + Math.random(),
      year: parseInt(copyTargetYear),
    }));
    setAllFormats((prev) => [...newFormats, ...prev]);
    setAvailableYears((prev) => [...new Set([...prev, parseInt(copyTargetYear)])].sort((a, b) => b - a));
    setIsCopyDialogOpen(false);
    setCopySourceYear('');
    setCopyTargetYear('');
    setCopying(false);
  };

  const yearOptions = [
    { value: 'all', label: 'Todos los años' },
    ...availableYears.map((y) => ({ value: y.toString(), label: y.toString() })),
  ];

  const sourceYearOptions = availableYears.map((y) => ({ value: y.toString(), label: y.toString() }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Formatos Exógenos DIAN</h1>
        <p className="text-gray-500 dark:text-gray-400">Administre formatos y conceptos para reportes exógenos</p>
      </header>

      {/* Info Card */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Información sobre Formatos Exógenos</h2>
        <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <strong className="text-gray-900 dark:text-gray-100">Formatos Exógenos:</strong> Son reportes que las
            empresas deben presentar a la DIAN con información tributaria.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-100">Conceptos:</strong> Cada formato contiene diferentes
            conceptos que clasifican los tipos de transacciones a reportar.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-gray-100">Códigos PUC:</strong> Plan Único de Cuentas colombiano
            (6 dígitos) asociado a cada concepto para facilitar la clasificación contable.
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-44">
                <Select
                  options={yearOptions}
                  value={filterYear}
                  onChange={setFilterYear}
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={formatCodeQuery}
                  onChange={(e) => setFormatCodeQuery(e.target.value)}
                  placeholder="Código formato"
                  className="pl-10 w-40 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                />
              </div>
              <Input
                value={formatNameQuery}
                onChange={(e) => setFormatNameQuery(e.target.value)}
                placeholder="Nombre formato"
                className="w-64 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCopyDialogOpen(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar a Nueva Vigencia
              </Button>
              <Button onClick={handleNewFormat}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Formato
              </Button>
            </div>
          </div>
        </div>

        {/* Formats List */}
        <div className="p-4 space-y-2">
          {formats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {filterYear === 'all'
                ? 'No hay formatos registrados'
                : `No se encontraron formatos para el año ${filterYear}`}
            </div>
          ) : (
            formats.map((format) => (
              <div key={format.id} className="border border-gray-200 dark:border-slate-700 rounded-lg">
                {/* Format Header */}
                <div
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:bg-slate-800/50 cursor-pointer"
                  onClick={() => toggleFormat(format.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {expandedFormat === format.id ? (
                      <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                    <span className="font-mono font-semibold text-indigo-400">{format.code}</span>
                    <span className="text-gray-500">({format.year})</span>
                    <span className="text-gray-800 dark:text-gray-200">{format.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFormat(format);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNewConcept(format.id);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Concepto
                    </Button>
                  </div>
                </div>

                {/* Concepts Table (Expanded) */}
                {expandedFormat === format.id && (
                  <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-4">
                    {!formatConcepts[format.id] ? (
                      <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
                      </div>
                    ) : formatConcepts[format.id].length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        No hay conceptos para este formato
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-transparent">
                            <TableHead className="text-gray-500 dark:text-gray-400">Código</TableHead>
                            <TableHead className="text-gray-500 dark:text-gray-400">Nombre</TableHead>
                            <TableHead className="text-gray-500 dark:text-gray-400">Código PUC</TableHead>
                            <TableHead className="text-gray-500 dark:text-gray-400">Cuenta PUC</TableHead>
                            <TableHead className="text-gray-500 dark:text-gray-400 text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formatConcepts[format.id].map((concept) => (
                            <TableRow
                              key={concept.id}
                              className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50"
                            >
                              <TableCell className="font-mono text-indigo-400">
                                {concept.code}
                              </TableCell>
                              <TableCell className="text-gray-700 dark:text-gray-300">{concept.name}</TableCell>
                              <TableCell className="font-mono text-gray-500 dark:text-gray-400">
                                {concept.account_code || '-'}
                              </TableCell>
                              <TableCell className="text-gray-500 dark:text-gray-400">
                                {concept.account_name || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                  onClick={() => handleEditConcept(concept, format.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Modal */}
      <ExogenousForm
        format={editingFormat}
        concept={editingConcept}
        editingType={editingType}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingFormat(null);
          setEditingConcept(null);
          setCurrentFormatForConcept(null);
        }}
        onSaveFormat={handleSaveFormat}
        onSaveConcept={handleSaveConcept}
        loading={saving}
      />

      {/* Copy Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Copiar Formatos a Nueva Vigencia</DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Copie todos los formatos y conceptos de un año a otro. El año destino no debe tener
              formatos existentes.
            </p>
          </DialogHeader>
          <form onSubmit={handleCopyFormats} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Año Origen *</Label>
              <Select
                options={sourceYearOptions}
                value={copySourceYear}
                onChange={setCopySourceYear}
                placeholder="Seleccione el año origen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_year" className="text-gray-800 dark:text-gray-200">
                Año Destino (Nuevo) *
              </Label>
              <Input
                id="target_year"
                type="number"
                value={copyTargetYear}
                onChange={(e) => setCopyTargetYear(e.target.value)}
                placeholder="Ej: 2025"
                min="2000"
                max="2100"
                required
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">
                El año destino no debe tener formatos existentes
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCopyDialogOpen(false)}
                disabled={copying}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={copying || !copySourceYear || !copyTargetYear}>
                {copying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Copiar Formatos
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
