'use client';

import { useState } from 'react';
import {
  Search,
  Pencil,
  Mail,
  Phone,
  User,
  DollarSign,
  Calendar,
  Building2,
  MoreHorizontal,
  UserX,
  UserCheck,
  Trash2,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
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
import { Select } from '@/shared/components/ui/select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { useEmployees } from '../hooks/useEmployees';
import { EMPLOYEE_STATUS_LABELS, EMPLOYEE_STATUS_COLORS } from '../types';
import type { Employee, EmployeeStatus } from '../types';

interface EmployeesListProps {
  canEdit: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canTerminate: boolean;
  canDelete: boolean;
  onView?: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onActivate: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
  onTerminate: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'INACTIVE', label: 'Inactivos' },
  { value: 'ON_LEAVE', label: 'En Licencia' },
  { value: 'TERMINATED', label: 'Terminados' },
];

export function EmployeesList({
  canEdit,
  canActivate,
  canDeactivate,
  canTerminate,
  canDelete,
  onView,
  onEdit,
  onActivate,
  onDeactivate,
  onTerminate,
  onDelete,
}: EmployeesListProps) {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    employees,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage,
    setStatusFilter: applyStatusFilter,
  } = useEmployees({ limit: PAGE_SIZE });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(searchInput);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    applyStatusFilter(value === 'all' ? undefined : (value as EmployeeStatus));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      )}

      {/* Table con Search integrado */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
              <span>Lista de Empleados</span>
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <div className="flex gap-2 flex-1 md:max-w-xl">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar nombre, documento o correo..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-9 h-9"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
              </form>
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={handleStatusChange}
                placeholder="Estado"
                className="w-[160px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Empleado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Identificación</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Contacto</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Contrato</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Salario</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer"
                      onClick={() => onView?.(emp)}
                    >
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {emp.name || '-'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {emp.identification_number || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white font-mono">
                            {emp.identification_number || '-'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {emp.type_document_identification?.name || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {emp.email && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{emp.email}</span>
                            </div>
                          )}
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400">
                              <Phone className="h-3 w-3" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-400">
                            <Building2 className="h-3 w-3" />
                            <span>{emp.current_contract?.contract_type?.name || 'Sin contrato'}</span>
                          </div>
                          {emp.hire_date && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                              <Calendar className="h-3 w-3" />
                              <span>Desde {formatDate(emp.hire_date)}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span>{emp.current_salary?.salary != null ? <FormattedNumber value={emp.current_salary.salary} type="currency" /> : '-'}</span>
                        </div>
                        {emp.current_salary?.transportation_allowance && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            + Aux. Transporte
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            emp.employee_status
                              ? EMPLOYEE_STATUS_COLORS[emp.employee_status]
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {emp.employee_status
                            ? EMPLOYEE_STATUS_LABELS[emp.employee_status]
                            : 'Sin estado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onView && (
                              <DropdownMenuItem onClick={() => onView(emp)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalle
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <DropdownMenuItem onClick={() => onEdit(emp)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canActivate && emp.employee_status !== 'ACTIVE' && (
                              <DropdownMenuItem onClick={() => onActivate(emp)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activar
                              </DropdownMenuItem>
                            )}
                            {canDeactivate && emp.employee_status === 'ACTIVE' && (
                              <DropdownMenuItem onClick={() => onDeactivate(emp)}>
                                <UserX className="h-4 w-4 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                            )}
                            {canTerminate && emp.employee_status !== 'TERMINATED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onTerminate(emp)}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Terminar Contrato
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDelete(emp)}
                                  className="text-red-600 focus:text-red-600"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} empleados)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
