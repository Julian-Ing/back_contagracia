'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { MoreHorizontal, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import type { TravelExpense, TravelExpenseStatus, TravelExpenseCategory } from '../types';
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_STATUS_COLORS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_OPTIONS,
} from '../types';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface TravelExpenseListProps {
  expenses: TravelExpense[];
  total: number;
  skip: number;
  take: number;
  loading: boolean;
  error: string | null;
  statusFilter?: TravelExpenseStatus;
  categoryFilter?: TravelExpenseCategory;
  onPaginate: (skip: number) => void;
  onFilterStatus: (status: TravelExpenseStatus | undefined) => void;
  onFilterCategory: (category: TravelExpenseCategory | undefined) => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TravelExpenseList({
  expenses,
  total,
  skip,
  take,
  loading,
  error,
  statusFilter,
  categoryFilter,
  onPaginate,
  onFilterStatus,
  onFilterCategory,
  onApprove,
  onReject,
  onDelete,
}: TravelExpenseListProps) {
  const { can } = usePermissions();
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentPage = Math.floor(skip / take) + 1;
  const totalPages = Math.ceil(total / take);

  const handleApprove = async (id: string) => {
    try {
      setSubmitting(true);
      await onApprove(id);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialogId || !rejectionReason.trim()) return;
    try {
      setSubmitting(true);
      await onReject(rejectDialogId, rejectionReason);
      setRejectDialogId(null);
      setRejectionReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setSubmitting(true);
      await onDelete(id);
    } finally {
      setSubmitting(false);
    }
  };

  const statusSelectOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'APPROVED', label: 'Aprobados' },
    { value: 'REJECTED', label: 'Rechazados' },
    { value: 'IN_PROGRESS', label: 'En Curso' },
    { value: 'PENDING_LEGALIZATION', label: 'Pend. Legalizacion' },
    { value: 'LEGALIZED', label: 'Legalizados' },
    { value: 'CANCELLED', label: 'Cancelados' },
  ];

  const categorySelectOptions = [
    { value: '', label: 'Todas las categorias' },
    ...EXPENSE_CATEGORY_OPTIONS,
  ];

  return (
    <>
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
            <span>Solicitudes de Viaticos</span>
            <Badge variant="secondary">{total} solicitudes</Badge>
          </CardTitle>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="w-56">
              <Select
                options={statusSelectOptions}
                value={statusFilter || ''}
                onChange={(val) => onFilterStatus((val || undefined) as TravelExpenseStatus | undefined)}
                placeholder="Filtrar por estado"
                searchable
              />
            </div>
            <div className="w-56">
              <Select
                options={categorySelectOptions}
                value={categoryFilter || ''}
                onChange={(val) => onFilterCategory((val || undefined) as TravelExpenseCategory | undefined)}
                placeholder="Filtrar por categoria"
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
                  <TableHead className="text-gray-600 dark:text-slate-300">Codigo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Empleado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Categoria</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Destino</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Fechas</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Monto</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-gray-200 dark:border-slate-700">
                      <TableCell>
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-32" />
                      </TableCell>
                      <TableCell>
                        <div className="animate-pulse h-5 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-40" />
                      </TableCell>
                      <TableCell>
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="animate-pulse h-5 bg-gray-200 dark:bg-slate-700 rounded w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-slate-400">
                      No hay solicitudes de viaticos
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((te) => (
                    <TableRow
                      key={te.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <span className="font-mono text-sm text-gray-600 dark:text-slate-300">
                          {te.expense_code || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {te.employee_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={EXPENSE_CATEGORY_COLORS[te.expense_category] || ''}>
                          {EXPENSE_CATEGORY_LABELS[te.expense_category] || te.expense_category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-slate-300">
                          {te.destination}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 dark:text-slate-300">
                          {formatDate(te.start_date)} — {formatDate(te.end_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCOP(te.assigned_amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={EXPENSE_STATUS_COLORS[te.status] || ''}>
                          {EXPENSE_STATUS_LABELS[te.status] || te.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {te.status === 'PENDING' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {can('hr_expenses.approve') && (
                                <DropdownMenuItem
                                  onClick={() => handleApprove(te.id)}
                                  disabled={submitting}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                                  Aprobar
                                </DropdownMenuItem>
                              )}
                              {can('hr_expenses.reject') && (
                                <DropdownMenuItem
                                  onClick={() => setRejectDialogId(te.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                  Rechazar
                                </DropdownMenuItem>
                              )}
                              {can('hr_expenses.edit') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(te.id)}
                                    disabled={submitting}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {te.status === 'REJECTED' && te.rejection_reason && (
                          <span className="text-xs text-red-500 dark:text-red-400" title={te.rejection_reason}>
                            {te.rejection_reason.length > 30
                              ? te.rejection_reason.slice(0, 30) + '...'
                              : te.rejection_reason}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginacion */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Pagina {currentPage} de {totalPages} ({total} solicitudes)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginate((currentPage - 2) * take)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginate(currentPage * take)}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={(open) => !open && setRejectDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Viatico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection_reason">Razon del Rechazo</Label>
              <Input
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Indique la razon del rechazo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !rejectionReason.trim()}
            >
              {submitting ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
