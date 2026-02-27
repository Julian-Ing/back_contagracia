'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Search, Plus, ArrowDownCircle, ArrowUpCircle, CheckCircle, XCircle, Clock, Eye,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { formatDate } from '@/shared/utils/formatDate';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { storageTransfersService } from '../services/storage-transfers.service';
import { CreateStorageTransferDialog } from './CreateStorageTransferDialog';
import type { StorageTransferItem } from '../types';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
];

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock },
  APPROVED: { label: 'Aprobada', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
  REJECTED: { label: 'Rechazada', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

interface StorageTransfersListProps {
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
}

export const StorageTransfersList = ({ canCreate, canApprove, canReject }: StorageTransfersListProps) => {
  const [transfers, setTransfers] = useState<StorageTransferItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Detail dialog
  const [selectedTransfer, setSelectedTransfer] = useState<StorageTransferItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const limit = 10;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storageTransfersService.getAll({
        search: debouncedSearch || undefined,
        page,
        limit,
        status: statusFilter || undefined,
      });
      setTransfers(res.data);
      setTotal(res.total);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando transferencias');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleApprove = async (id: string) => {
    try {
      await storageTransfersService.approve(id);
      toast.success('Transferencia aprobada');
      fetchTransfers();
      if (detailOpen) setDetailOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error aprobando transferencia');
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    try {
      await storageTransfersService.reject(rejectingId, rejectionReason.trim());
      toast.success('Transferencia rechazada');
      setRejectOpen(false);
      setRejectingId(null);
      setRejectionReason('');
      fetchTransfers();
      if (detailOpen) setDetailOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error rechazando transferencia');
    }
  };

  const openDetail = (transfer: StorageTransferItem) => {
    setSelectedTransfer(transfer);
    setDetailOpen(true);
  };

  const openReject = (id: string) => {
    setRejectingId(id);
    setRejectionReason('');
    setRejectOpen(true);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por consecutivo, razón, producto, bodega..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-48">
          <SearchableSelect
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Todos los estados"
            clearable={!!statusFilter}
          />
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Solicitar Transferencia
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consecutivo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Razón</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Solicitado por</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron transferencias
                </TableCell>
              </TableRow>
            ) : transfers.map((t) => {
              const statusCfg = STATUS_CONFIG[t.status];
              const StatusIcon = statusCfg.icon;
              return (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(t)}>
                  <TableCell className="font-mono text-sm font-medium">{t.consecutive}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(t.date)}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{t.reason || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusCfg.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t.transferred_by?.name || '-'}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">
                      {t.items.filter(i => i.direction === 'OUT').length} salidas, {t.items.filter(i => i.direction === 'IN').length} entradas
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(t); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} transferencia{total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog detalle */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Transferencia {selectedTransfer?.consecutive}
              {selectedTransfer && (
                <Badge className={STATUS_CONFIG[selectedTransfer.status].className}>
                  {STATUS_CONFIG[selectedTransfer.status].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              {/* Info general */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fecha:</span>{' '}
                  {formatDate(selectedTransfer.date)}
                </div>
                <div>
                  <span className="text-muted-foreground">Solicitado por:</span>{' '}
                  {selectedTransfer.transferred_by?.name || '-'}
                </div>
                {selectedTransfer.reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Razón:</span>{' '}
                    {selectedTransfer.reason}
                  </div>
                )}
                {selectedTransfer.approved_by && (
                  <div>
                    <span className="text-muted-foreground">Aprobado por:</span>{' '}
                    {selectedTransfer.approved_by.name}
                  </div>
                )}
                {selectedTransfer.approved_at && (
                  <div>
                    <span className="text-muted-foreground">Fecha aprobación:</span>{' '}
                    {formatDate(selectedTransfer.approved_at)}
                  </div>
                )}
                {selectedTransfer.rejected_by && (
                  <div>
                    <span className="text-muted-foreground">Rechazado por:</span>{' '}
                    {selectedTransfer.rejected_by.name}
                  </div>
                )}
                {selectedTransfer.rejection_reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Motivo rechazo:</span>{' '}
                    {selectedTransfer.rejection_reason}
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Líneas de transferencia</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Bodega</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransfer.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.direction === 'OUT' ? (
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                <ArrowUpCircle className="h-3 w-3 mr-1" /> Salida
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                <ArrowDownCircle className="h-3 w-3 mr-1" /> Entrada
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{item.product?.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{item.product?.consecutive}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.storage ? `${item.storage.warehouse_name} / ${item.storage.name}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <FormattedNumber value={item.quantity} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Acciones */}
              {selectedTransfer.status === 'PENDING' && (canApprove || canReject) && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  {canReject && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => openReject(selectedTransfer.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  )}
                  {canApprove && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(selectedTransfer.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprobar
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog rechazar */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar transferencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo del rechazo</label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: Cantidades incorrectas..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog crear */}
      <CreateStorageTransferDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchTransfers}
      />
    </div>
  );
};
