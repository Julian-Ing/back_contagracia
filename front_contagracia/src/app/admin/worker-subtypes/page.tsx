'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Pencil, FileText, Users2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import {
  WorkerSubtypeForm,
  type WorkerSubtype,
  type WorkerSubtypeRule,
} from '@/modules/admin';

// Mock data
const MOCK_SUBTYPES: WorkerSubtype[] = [
  { id: '1', code: '01', name: 'Dependiente', is_active: true },
  { id: '2', code: '02', name: 'Servicio Doméstico', is_active: true },
  { id: '3', code: '03', name: 'Independiente', is_active: true },
  { id: '4', code: '04', name: 'Madre Comunitaria', is_active: true },
  { id: '5', code: '12', name: 'Aprendiz Etapa Lectiva', is_active: true },
  { id: '6', code: '16', name: 'Pensionado que labora', is_active: true },
  { id: '7', code: '18', name: 'Profesor de establecimiento particular', is_active: true },
  { id: '8', code: '19', name: 'Conductor servicio público', is_active: true },
  { id: '9', code: '20', name: 'Cotizante miembro de un consorcio', is_active: true },
  { id: '10', code: '21', name: 'Cotizante en tiempo parcial', is_active: false },
];

const MOCK_RULES: WorkerSubtypeRule[] = [
  {
    id: '1',
    sub_type_worker_id: '1',
    sub_type_workers: { id: '1', code: '01', name: 'Dependiente', is_active: true },
    health_employee_pays: true,
    health_employee_rate: null,
    health_employer_rate: 8.5,
    pension_employee_pays: true,
    pension_employee_rate: null,
    pension_employer_rate: 12,
    ccf_applies: true,
    icbf_applies: true,
    sena_applies: true,
    arl_applies: true,
    fsp_applies: false,
    fsp_special_rate: null,
    ibc_min_smmlv_percentage: null,
    legal_notes: '',
    is_active: true,
  },
  {
    id: '2',
    sub_type_worker_id: '2',
    sub_type_workers: { id: '2', code: '02', name: 'Servicio Doméstico', is_active: true },
    health_employee_pays: true,
    health_employee_rate: null,
    health_employer_rate: 8.5,
    pension_employee_pays: true,
    pension_employee_rate: null,
    pension_employer_rate: 12,
    ccf_applies: true,
    icbf_applies: false,
    sena_applies: false,
    arl_applies: true,
    fsp_applies: false,
    fsp_special_rate: null,
    ibc_min_smmlv_percentage: null,
    legal_notes: 'Decreto 721/2013 - Exento de ICBF y SENA',
    is_active: true,
  },
  {
    id: '3',
    sub_type_worker_id: '3',
    sub_type_workers: { id: '3', code: '03', name: 'Independiente', is_active: true },
    health_employee_pays: true,
    health_employee_rate: 12.5,
    health_employer_rate: null,
    pension_employee_pays: true,
    pension_employee_rate: 16,
    pension_employer_rate: null,
    ccf_applies: false,
    icbf_applies: false,
    sena_applies: false,
    arl_applies: true,
    fsp_applies: true,
    fsp_special_rate: null,
    ibc_min_smmlv_percentage: 40,
    legal_notes: 'IBC mínimo 40% del ingreso mensual',
    is_active: true,
  },
  {
    id: '4',
    sub_type_worker_id: '6',
    sub_type_workers: { id: '6', code: '16', name: 'Pensionado que labora', is_active: true },
    health_employee_pays: true,
    health_employee_rate: null,
    health_employer_rate: 8.5,
    pension_employee_pays: false,
    pension_employee_rate: null,
    pension_employer_rate: null,
    ccf_applies: true,
    icbf_applies: true,
    sena_applies: true,
    arl_applies: true,
    fsp_applies: true,
    fsp_special_rate: 1,
    ibc_min_smmlv_percentage: null,
    legal_notes: 'Decreto 1047/2014 - Pensionado con ingresos adicionales',
    is_active: true,
  },
  {
    id: '5',
    sub_type_worker_id: '8',
    sub_type_workers: { id: '8', code: '19', name: 'Conductor servicio público', is_active: true },
    health_employee_pays: true,
    health_employee_rate: 12.5,
    health_employer_rate: null,
    pension_employee_pays: true,
    pension_employee_rate: 16,
    pension_employer_rate: null,
    ccf_applies: false,
    icbf_applies: false,
    sena_applies: false,
    arl_applies: true,
    fsp_applies: false,
    fsp_special_rate: null,
    ibc_min_smmlv_percentage: 40,
    legal_notes: 'Decreto 1047/2014 - IBC mínimo 40% SMMLV',
    is_active: true,
  },
];

// Color mapping for subtypes
const getSubtypeColor = (code: string) => {
  const colors: Record<string, string> = {
    '01': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '02': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    '03': 'bg-green-500/20 text-green-400 border-green-500/30',
    '04': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    '12': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    '16': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    '18': 'bg-red-500/20 text-red-400 border-red-500/30',
    '19': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    '20': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    '21': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  };
  return colors[code] || 'bg-gray-500/20 text-gray-500 dark:text-gray-400 border-gray-500/30';
};

export default function WorkerSubtypesPage() {
  const [subtypes, setSubtypes] = useState<WorkerSubtype[]>([]);
  const [rules, setRules] = useState<WorkerSubtypeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubtype, setEditingSubtype] = useState<WorkerSubtype | null>(null);
  const [editingRule, setEditingRule] = useState<WorkerSubtypeRule | null>(null);
  const [editingType, setEditingType] = useState<'subtype' | 'rule'>('subtype');

  const fetchData = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSubtypes(MOCK_SUBTYPES);
    setRules(MOCK_RULES);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSubtypes = subtypes.filter(
    (st) =>
      st.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRules = rules.filter(
    (rule) =>
      rule.sub_type_workers?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.sub_type_workers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditSubtype = (subtype: WorkerSubtype) => {
    setEditingSubtype(subtype);
    setEditingRule(null);
    setEditingType('subtype');
    setIsFormOpen(true);
  };

  const handleEditRule = (rule: WorkerSubtypeRule) => {
    setEditingRule(rule);
    setEditingSubtype(null);
    setEditingType('rule');
    setIsFormOpen(true);
  };

  const handleSaveSubtype = async (data: Partial<WorkerSubtype>) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (editingSubtype) {
      setSubtypes((prev) =>
        prev.map((s) => (s.id === editingSubtype.id ? { ...s, ...data } as WorkerSubtype : s))
      );
    }
    setIsFormOpen(false);
    setEditingSubtype(null);
    setSaving(false);
  };

  const handleSaveRule = async (data: Partial<WorkerSubtypeRule>) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (editingRule) {
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? { ...r, ...data } as WorkerSubtypeRule : r))
      );
    }
    setIsFormOpen(false);
    setEditingRule(null);
    setSaving(false);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subtipos de Trabajador</h1>
        <p className="text-gray-500 dark:text-gray-400">Gestión de subtipos y reglas de liquidación</p>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reglas de Liquidación
          </TabsTrigger>
          <TabsTrigger value="subtypes" className="flex items-center gap-2">
            <Users2 className="h-4 w-4" />
            Subtipos
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Reglas de Liquidación</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure las tasas y parafiscales para cada subtipo de trabajador
              </p>
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

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="text-gray-500 dark:text-gray-400">Subtipo</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400">Empleado</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400">Empleador</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400">Parafiscales</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400">Notas</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 text-center">Estado</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.length === 0 ? (
                    <TableRow className="border-gray-200 dark:border-slate-700">
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No se encontraron reglas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRules.map((rule) => (
                      <TableRow key={rule.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50">
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={getSubtypeColor(rule.sub_type_workers?.code || '')}
                            >
                              {rule.sub_type_workers?.code}
                            </Badge>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {rule.sub_type_workers?.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                            {rule.health_employee_pays && (
                              <div>S: {rule.health_employee_rate ?? 4}%</div>
                            )}
                            {rule.pension_employee_pays && (
                              <div>P: {rule.pension_employee_rate ?? 4}%</div>
                            )}
                            {!rule.health_employee_pays && !rule.pension_employee_pays && (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                            {rule.health_employer_rate !== null && (
                              <div>S: {rule.health_employer_rate}%</div>
                            )}
                            {rule.pension_employer_rate !== null && (
                              <div>P: {rule.pension_employer_rate}%</div>
                            )}
                            {rule.health_employer_rate === null &&
                              rule.pension_employer_rate === null && (
                                <span className="text-gray-500">0%</span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {rule.ccf_applies && (
                              <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600">
                                CCF
                              </Badge>
                            )}
                            {rule.icbf_applies && (
                              <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600">
                                ICBF
                              </Badge>
                            )}
                            {rule.sena_applies && (
                              <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600">
                                SENA
                              </Badge>
                            )}
                            {rule.arl_applies && (
                              <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600">
                                ARL
                              </Badge>
                            )}
                            {rule.fsp_applies && (
                              <Badge variant="outline" className="text-xs border-gray-300 dark:border-slate-600">
                                FSP
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rule.legal_notes ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                  <p className="text-xs text-gray-800 dark:text-gray-200">{rule.legal_notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              rule.is_active
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }
                          >
                            {rule.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            onClick={() => handleEditRule(rule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Subtypes Tab */}
        <TabsContent value="subtypes">
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Subtipos de Trabajador</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Información básica de los subtipos</p>
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

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="text-gray-500 dark:text-gray-400">ID</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400">Código</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400">Nombre</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 text-center">Estado</TableHead>
                    <TableHead className="text-gray-500 dark:text-gray-400 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubtypes.length === 0 ? (
                    <TableRow className="border-gray-200 dark:border-slate-700">
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No se encontraron subtipos
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubtypes.map((subtype) => (
                      <TableRow
                        key={subtype.id}
                        className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50"
                      >
                        <TableCell className="text-gray-900 dark:text-gray-100 font-medium">{subtype.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSubtypeColor(subtype.code)}>
                            {subtype.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">{subtype.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              subtype.is_active
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }
                          >
                            {subtype.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            onClick={() => handleEditSubtype(subtype)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Form Modal */}
      <WorkerSubtypeForm
        subtype={editingSubtype}
        rule={editingRule}
        editingType={editingType}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSubtype(null);
          setEditingRule(null);
        }}
        onSaveSubtype={handleSaveSubtype}
        onSaveRule={handleSaveRule}
        loading={saving}
      />
    </div>
  );
}
