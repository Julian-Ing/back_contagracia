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
import { MoreHorizontal, Search, Pencil, CheckCircle, Archive, Trash2 } from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useObservations } from '../hooks/useObservations';
import type { Observation, ObservationType, ObservationSeverity, ObservationStatus } from '../types';
import {
  OBSERVATION_TYPE_LABELS,
  OBSERVATION_TYPE_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../types';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ObservationsListProps {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (observation: Observation) => void;
  onDelete: (observation: Observation) => void;
  refreshKey?: number;
}

export function ObservationsList({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  refreshKey,
}: ObservationsListProps) {
  const { can } = usePermissions();
  const {
    observations,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage,
    setTypeFilter,
    setSeverityFilter,
    setStatusFilter,
  } = useObservations();

  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Observation | null>(null);

  const handleSearch = () => {
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'RECOGNITION', label: 'Reconocimiento' },
    { value: 'FEEDBACK', label: 'Retroalimentación' },
    { value: 'INCIDENT', label: 'Incidente' },
    { value: 'WARNING', label: 'Amonestación' },
    { value: 'ACHIEVEMENT', label: 'Logro' },
    { value: 'CONCERN', label: 'Preocupación' },
  ];

  const severityOptions = [
    { value: '', label: 'Todas las severidades' },
    { value: 'LOW', label: 'Baja' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
  ];

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'RESOLVED', label: 'Resuelta' },
    { value: 'ARCHIVED', label: 'Archivada' },
  ];

  return (
    <>
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
            <span>Listado de Observaciones</span>
            <Badge variant="secondary">{total} observaciones</Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex gap-2 flex-1 min-w-[200px] max-w-md">
              <Input
                placeholder="Buscar por empleado o título..."
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
                options={typeOptions}
                value=""
                onChange={(val) => setTypeFilter((val || undefined) as ObservationType | undefined)}
                placeholder="Tipo"
                searchable
              />
            </div>
            <div className="w-48">
              <Select
                options={severityOptions}
                value=""
                onChange={(val) => setSeverityFilter((val || undefined) as ObservationSeverity | undefined)}
                placeholder="Severidad"
                searchable
              />
            </div>
            <div className="w-48">
              <Select
                options={statusOptions}
                value=""
                onChange={(val) => setStatusFilter((val || undefined) as ObservationStatus | undefined)}
                placeholder="Estado"
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
                  <TableHead className="text-gray-600 dark:text-slate-300">Título</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Severidad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Fecha</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-gray-200 dark:border-slate-700">
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-32" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-40" /></TableCell>
                      <TableCell><div className="animate-pulse h-5 bg-gray-200 dark:bg-slate-700 rounded w-24" /></TableCell>
                      <TableCell><div className="animate-pulse h-5 bg-gray-200 dark:bg-slate-700 rounded w-16" /></TableCell>
                      <TableCell><div className="animate-pulse h-5 bg-gray-200 dark:bg-slate-700 rounded w-20" /></TableCell>
                      <TableCell><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" /></TableCell>
                      <TableCell className="text-right"><div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : observations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-slate-400">
                      No hay observaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  observations.map((obs) => (
                    <TableRow
                      key={obs.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {obs.third_party?.name || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-700 dark:text-slate-300 text-sm">
                          {obs.title}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={OBSERVATION_TYPE_COLORS[obs.observation_type] || ''}>
                          {OBSERVATION_TYPE_LABELS[obs.observation_type] || obs.observation_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={SEVERITY_COLORS[obs.severity] || ''}>
                          {SEVERITY_LABELS[obs.severity] || obs.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[obs.status] || ''}>
                          {STATUS_LABELS[obs.status] || obs.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-slate-300">
                          {formatDate(obs.observation_date)}
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
                            {canEdit && obs.status === 'ACTIVE' && (
                              <DropdownMenuItem onClick={() => onEdit(obs)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canEdit && obs.status === 'ACTIVE' && (
                              <DropdownMenuItem onClick={() => onEdit({ ...obs, status: 'RESOLVED' as const })}>
                                <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                                Marcar Resuelta
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(obs)}
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
            Página {page} de {totalPages} ({total} observaciones)
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
            <AlertDialogTitle>Eliminar Observación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la observación &quot;{deleteTarget?.title}&quot;?
              Esta acción no se puede deshacer.
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
