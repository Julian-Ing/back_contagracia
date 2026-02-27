'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { MoreHorizontal, Search, Pencil, CheckCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { useEvaluations } from '../hooks/useEvaluations';
import type { Evaluation, EvaluationStatus } from '../types';
import { EVALUATION_STATUS_LABELS, EVALUATION_STATUS_COLORS } from '../types';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

interface EvaluationsListProps {
  canEdit: boolean;
  canComplete: boolean;
  canApprove: boolean;
  canDelete: boolean;
  onEdit: (evaluation: Evaluation) => void;
  onComplete: (evaluation: Evaluation) => void;
  onApprove: (evaluation: Evaluation) => void;
  onDelete: (evaluation: Evaluation) => void;
  refreshKey?: number;
}

export function EvaluationsList({
  canEdit,
  canComplete,
  canApprove,
  canDelete,
  onEdit,
  onComplete,
  onApprove,
  onDelete,
  refreshKey,
}: EvaluationsListProps) {
  const {
    evaluations,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage,
    setStatusFilter,
    setPeriodFilter,
  } = useEvaluations();

  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null);

  const handleSearch = () => {
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'APPROVED', label: 'Aprobada' },
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const periodOptions = [
    { value: '', label: 'Todos los periodos' },
    { value: `${currentYear}-01`, label: `Enero ${currentYear}` },
    { value: `${currentYear}-02`, label: `Febrero ${currentYear}` },
    { value: `${currentYear}-03`, label: `Marzo ${currentYear}` },
    { value: `${currentYear}-04`, label: `Abril ${currentYear}` },
    { value: `${currentYear}-05`, label: `Mayo ${currentYear}` },
    { value: `${currentYear}-06`, label: `Junio ${currentYear}` },
    { value: `${currentYear}-07`, label: `Julio ${currentYear}` },
    { value: `${currentYear}-08`, label: `Agosto ${currentYear}` },
    { value: `${currentYear}-09`, label: `Septiembre ${currentYear}` },
    { value: `${currentYear}-10`, label: `Octubre ${currentYear}` },
    { value: `${currentYear}-11`, label: `Noviembre ${currentYear}` },
    { value: `${currentYear}-12`, label: `Diciembre ${currentYear}` },
  ];

  return (
    <>
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
            <span>Listado de Evaluaciones</span>
            <Badge variant="secondary">{total} evaluaciones</Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex gap-2 flex-1 min-w-[200px] max-w-md">
              <Input
                placeholder="Buscar por empleado..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button variant="outline" size="sm" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-48">
              <Select
                options={statusOptions}
                value=""
                onChange={(val) => setStatusFilter((val || undefined) as EvaluationStatus | undefined)}
                placeholder="Estado"
                searchable
              />
            </div>
            <div className="w-52">
              <Select
                options={periodOptions}
                value=""
                onChange={(val) => setPeriodFilter(val || undefined)}
                placeholder="Periodo"
                searchable
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 text-red-600 dark:text-red-400">{error}</div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Empleado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Periodo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center">Asistencia</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center">Desempeño</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center">Actitud</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center">Global</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Fecha</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-gray-200 dark:border-slate-700">
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-32" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-20" /></TableCell>
                      <TableCell><div className="animate-pulse h-5 bg-gray-200 dark:bg-slate-700 rounded w-20" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-10 mx-auto" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-10 mx-auto" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-10 mx-auto" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-12 mx-auto" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" /></TableCell>
                      <TableCell className="text-right"><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : evaluations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500 dark:text-slate-400">
                      No hay evaluaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  evaluations.map((ev) => (
                    <TableRow
                      key={ev.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {ev.third_party?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700 dark:text-slate-300">
                          {ev.evaluation_period}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={EVALUATION_STATUS_COLORS[ev.status] || ''}>
                          {EVALUATION_STATUS_LABELS[ev.status] || ev.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${scoreColor(ev.attendance_score)}`}>
                          {ev.attendance_score ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${scoreColor(ev.performance_score)}`}>
                          {ev.performance_score ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-medium ${scoreColor(ev.attitude_score)}`}>
                          {ev.attitude_score ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${scoreColor(ev.overall_score)}`}>
                          {ev.overall_score !== null ? Number(ev.overall_score).toFixed(2) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-slate-300">
                          {formatDate(ev.evaluation_date)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && ev.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => onEdit(ev)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canComplete && ev.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => onComplete(ev)}>
                                <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                                Completar
                              </DropdownMenuItem>
                            )}
                            {canApprove && ev.status === 'COMPLETED' && (
                              <DropdownMenuItem onClick={() => onApprove(ev)}>
                                <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                                Aprobar
                              </DropdownMenuItem>
                            )}
                            {canDelete && ev.status !== 'APPROVED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(ev)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} evaluaciones)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Evaluación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la evaluación de{' '}
              &quot;{deleteTarget?.third_party?.name}&quot;
              del periodo {deleteTarget?.evaluation_period}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget);
                setDeleteTarget(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
