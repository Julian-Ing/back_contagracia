'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  CreditCard, Search, Plus, Pencil, Trash2, Loader2, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useCompanyPaymentMethods, companyPaymentMethodsService, PaymentMethodForm } from '@/modules/ar-ap';
import type { CompanyPaymentMethod } from '@/modules/ar-ap';

export default function PaymentMethodsPage() {
  const { can } = usePermissions();
  const canCreate = can('payment_methods.create');
  const canEdit = can('payment_methods.edit');
  const canDelete = can('payment_methods.delete');

  const list = useCompanyPaymentMethods();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CompanyPaymentMethod | null>(null);
  const [deleting, setDeleting] = useState<CompanyPaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setShowDialog(true);
  };

  const openEdit = (item: CompanyPaymentMethod) => {
    setEditing(item);
    setShowDialog(true);
  };

  const handleFormSuccess = () => {
    setShowDialog(false);
    list.refetch();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await companyPaymentMethodsService.delete(deleting.id);
      toast.success('Método de pago eliminado');
      setDeleting(null);
      list.refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute permission="payment_methods.view" deniedMessage="No tienes permisos para ver los métodos de pago.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-amber-500 text-white">
                <CreditCard className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Métodos de Pago</h1>
            </div>
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Método
              </Button>
            )}
          </div>
        </header>

        {/* Search */}
        <div className="mb-4 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o descripción..."
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {list.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : list.error ? (
              <div className="flex items-center justify-center py-12 gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <span>{list.error}</span>
              </div>
            ) : list.data.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron métodos de pago
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Consecutivo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[80px]">Estado</TableHead>
                    {(canEdit || canDelete) && (
                      <TableHead className="w-[100px] text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.consecutive || '—'}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.payment_method_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description || '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {item.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(item)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleting(item)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {list.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              {list.total} resultado(s) — Página {list.page} de {list.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={list.page <= 1}
                onClick={() => list.setPage(list.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={list.page >= list.totalPages}
                onClick={() => list.setPage(list.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
              </DialogTitle>
            </DialogHeader>
            <PaymentMethodForm
              mode={editing ? 'edit' : 'create'}
              editing={editing}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Eliminar Método de Pago</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de eliminar <strong>{deleting?.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
