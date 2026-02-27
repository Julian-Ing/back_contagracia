'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { PayrollConceptForm, type PayrollConcept } from '@/modules/admin';

// Mock data for payroll concepts
const MOCK_CONCEPTS: PayrollConcept[] = [
  {
    id: '1',
    concept_code: 'SAL001',
    concept_name: 'Salario Básico',
    concept_type: 'accrued',
    is_percentage: false,
    default_value: 0,
    default_percentage: 0,
    is_array: false,
    is_legal: true,
    is_active: true,
    description: 'Salario básico mensual del trabajador',
  },
  {
    id: '2',
    concept_code: 'AUX001',
    concept_name: 'Auxilio de Transporte',
    concept_type: 'accrued',
    is_percentage: false,
    default_value: 162000,
    default_percentage: 0,
    is_array: false,
    is_legal: true,
    is_active: true,
    description: 'Auxilio de transporte legal vigente',
  },
  {
    id: '3',
    concept_code: 'HEX001',
    concept_name: 'Horas Extra Diurnas',
    concept_type: 'accrued',
    is_percentage: true,
    default_value: 0,
    default_percentage: 25,
    is_array: true,
    is_legal: true,
    is_active: true,
    description: 'Recargo del 25% sobre hora ordinaria',
  },
  {
    id: '4',
    concept_code: 'HEX002',
    concept_name: 'Horas Extra Nocturnas',
    concept_type: 'accrued',
    is_percentage: true,
    default_value: 0,
    default_percentage: 75,
    is_array: true,
    is_legal: true,
    is_active: true,
    description: 'Recargo del 75% sobre hora ordinaria',
  },
  {
    id: '5',
    concept_code: 'DED001',
    concept_name: 'Salud Empleado',
    concept_type: 'deduction',
    is_percentage: true,
    default_value: 0,
    default_percentage: 4,
    is_array: false,
    is_legal: true,
    is_active: true,
    description: 'Aporte a salud del empleado (4%)',
    dian_percentage_code: 1001,
  },
  {
    id: '6',
    concept_code: 'DED002',
    concept_name: 'Pensión Empleado',
    concept_type: 'deduction',
    is_percentage: true,
    default_value: 0,
    default_percentage: 4,
    is_array: false,
    is_legal: true,
    is_active: true,
    description: 'Aporte a pensión del empleado (4%)',
    dian_percentage_code: 1002,
  },
  {
    id: '7',
    concept_code: 'DED003',
    concept_name: 'Fondo de Solidaridad Pensional',
    concept_type: 'deduction',
    is_percentage: true,
    default_value: 0,
    default_percentage: 1,
    is_array: false,
    is_legal: true,
    is_active: true,
    description: 'Aporte adicional para salarios >= 4 SMLV',
    dian_percentage_code: 1003,
  },
  {
    id: '8',
    concept_code: 'BON001',
    concept_name: 'Bonificación',
    concept_type: 'accrued',
    is_percentage: false,
    default_value: 0,
    default_percentage: 0,
    is_array: false,
    is_legal: false,
    is_active: true,
    description: 'Bonificación no constitutiva de salario',
  },
  {
    id: '9',
    concept_code: 'COM001',
    concept_name: 'Comisiones',
    concept_type: 'accrued',
    is_percentage: false,
    default_value: 0,
    default_percentage: 0,
    is_array: true,
    is_legal: true,
    is_active: true,
    description: 'Comisiones por ventas o desempeño',
  },
  {
    id: '10',
    concept_code: 'DED004',
    concept_name: 'Retención en la Fuente',
    concept_type: 'deduction',
    is_percentage: true,
    default_value: 0,
    default_percentage: 0,
    is_array: false,
    is_legal: true,
    is_active: true,
    description: 'Retención calculada según tabla de retención',
    dian_percentage_code: 1004,
  },
  {
    id: '11',
    concept_code: 'DED005',
    concept_name: 'Libranza',
    concept_type: 'deduction',
    is_percentage: false,
    default_value: 0,
    default_percentage: 0,
    is_array: false,
    is_legal: false,
    is_active: true,
    description: 'Descuento por crédito de libranza',
  },
  {
    id: '12',
    concept_code: 'INC001',
    concept_name: 'Incapacidad',
    concept_type: 'accrued',
    is_percentage: true,
    default_value: 0,
    default_percentage: 66.67,
    is_array: true,
    is_legal: true,
    is_active: true,
    description: 'Pago por días de incapacidad',
  },
];

export default function PayrollConceptsPage() {
  const [concepts, setConcepts] = useState<PayrollConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingConcept, setEditingConcept] = useState<PayrollConcept | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setConcepts(MOCK_CONCEPTS);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredConcepts = concepts.filter(
    (concept) =>
      concept.concept_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      concept.concept_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredConcepts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConcepts = filteredConcepts.slice(startIndex, endIndex);

  const handleEdit = (concept: PayrollConcept) => {
    setEditingConcept(concept);
    setIsFormOpen(true);
  };

  const handleSaveConcept = async (conceptData: Partial<PayrollConcept>) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (editingConcept) {
      setConcepts((prev) =>
        prev.map((c) =>
          c.id === editingConcept.id ? ({ ...c, ...conceptData } as PayrollConcept) : c
        )
      );
    }

    setIsFormOpen(false);
    setEditingConcept(null);
    setSaving(false);
  };

  // Check if concept can be edited (has default_value or default_percentage > 0)
  const canEdit = (concept: PayrollConcept) => {
    return concept.default_value > 0 || concept.default_percentage > 0;
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conceptos de Nómina</h1>
        <p className="text-gray-500 dark:text-gray-400">Editar valores de conceptos existentes</p>
      </header>

      {/* Card */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-transparent">
                <TableHead className="text-gray-500 dark:text-gray-400">Código</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400">Nombre</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400">Tipo</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400 text-center">Porcentaje</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400 text-center">Array</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400 text-center">Legal</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400 text-center">Estado</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedConcepts.length === 0 ? (
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No se encontraron conceptos
                  </TableCell>
                </TableRow>
              ) : (
                paginatedConcepts.map((concept) => (
                  <TableRow key={concept.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50">
                    <TableCell className="text-gray-900 dark:text-gray-100 font-medium">
                      {concept.concept_code}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">{concept.concept_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          concept.concept_type === 'accrued'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        }
                      >
                        {concept.concept_type === 'accrued' ? 'Devengado' : 'Deducción'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-gray-500 dark:text-gray-400">
                      {concept.is_percentage ? '✓' : '-'}
                    </TableCell>
                    <TableCell className="text-center text-gray-500 dark:text-gray-400">
                      {concept.is_array ? '✓' : '-'}
                    </TableCell>
                    <TableCell className="text-center text-gray-500 dark:text-gray-400">
                      {concept.is_legal ? '✓' : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          concept.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {concept.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit(concept) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                          onClick={() => handleEdit(concept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 dark:border-slate-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredConcepts.length)} de{' '}
              {filteredConcepts.length} resultados
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      <PayrollConceptForm
        concept={editingConcept}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingConcept(null);
        }}
        onSave={handleSaveConcept}
        loading={saving}
      />
    </div>
  );
}
