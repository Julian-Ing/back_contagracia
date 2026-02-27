'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { CreatePrepaymentModal } from './CreatePrepaymentModal';
import { PrepaymentDetailModal } from './PrepaymentDetailModal';
import {
  DollarSign, Search, Plus, Loader2, AlertCircle, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { usePrepayments } from '@/modules/ar-ap';
import type { PrepaymentType, PrepaymentStatus } from '@/modules/ar-ap';

const TYPE_OPTIONS = [
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'SUPPLIER', label: 'Proveedor' },
  { value: 'EMPLOYEE', label: 'Empleado' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'APPLIED', label: 'Aplicado' },
  { value: 'REFUNDED', label: 'Devuelto' },
  { value: 'VOIDED', label: 'Anulado' },
];

const TYPE_LABELS: Record<PrepaymentType, string> = {
  CLIENT: 'Cliente',
  SUPPLIER: 'Proveedor',
  EMPLOYEE: 'Empleado',
};

const TYPE_COLORS: Record<PrepaymentType, string> = {
  CLIENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUPPLIER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EMPLOYEE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const STATUS_LABELS: Record<PrepaymentStatus, string> = {
  ACTIVE: 'Activo',
  APPLIED: 'Aplicado',
  REFUNDED: 'Devuelto',
  VOIDED: 'Anulado',
};

const STATUS_COLORS: Record<PrepaymentStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  APPLIED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  REFUNDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  VOIDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const formatDate = (date: string) => {
  const [y, m, d] = date.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export default function PrepaymentsPage() {
  const { can } = usePermissions();
  const { hasModule } = useCompanyModules();
  const hasAccounting = hasModule('accounting');
  const canCreate = can('prepayments.create');
  const list = usePrepayments();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  return (
    <ProtectedRoute permission="prepayments.view" deniedMessage="No tienes permisos para ver los anticipos.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-amber-500 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Anticipos</h1>
            </div>
            {canCreate && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Anticipo
              </Button>
            )}
          </div>
        </header>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-72">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar consecutivo, tercero, cuenta..."
                value={list.search}
                onChange={(e) => list.setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-40">
            <SearchableSelect
              options={TYPE_OPTIONS}
              value={list.prepaymentType}
              onChange={(v) => list.setPrepaymentType(v as PrepaymentType | '')}
              placeholder="Tipo"
              clearable
            />
          </div>
          <div className="w-40">
            <SearchableSelect
              options={STATUS_OPTIONS}
              value={list.status}
              onChange={(v) => list.setStatus(v as PrepaymentStatus | '')}
              placeholder="Estado"
              clearable
            />
          </div>
          <div className="w-40">
            <DatePicker
              value={list.fromDate}
              onChange={(v) => list.setFromDate(v)}
              placeholder="Desde"
              clearable
            />
          </div>
          <div className="w-40">
            <DatePicker
              value={list.toDate}
              onChange={(v) => list.setToDate(v)}
              placeholder="Hasta"
              clearable
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
                No se encontraron anticipos
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Consecutivo</TableHead>
                    <TableHead className="w-[110px]">Fecha</TableHead>
                    <TableHead className="w-[100px]">Tipo</TableHead>
                    <TableHead>Tercero</TableHead>
                    {hasAccounting && <TableHead>Cuenta</TableHead>}
                    <TableHead>Banco</TableHead>
                    <TableHead>Metodo</TableHead>
                    {hasAccounting && <TableHead>Cuenta de cruce</TableHead>}
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="w-[90px]">Estado</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.consecutive || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(item.prepayment_date)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[item.prepayment_type]}`}>
                          {TYPE_LABELS[item.prepayment_type]}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.third_party_name}
                      </TableCell>
                      {hasAccounting && (
                        <TableCell className="text-sm text-muted-foreground">
                          <span className="font-mono">{item.account_code}</span>
                          {' '}
                          {item.account_name}
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {item.bank_account_name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.payment_method_name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      {hasAccounting && (
                        <TableCell className="text-sm text-muted-foreground">
                          {item.counterpart_account_code ? (
                            <>
                              <span className="font-mono">{item.counterpart_account_code}</span>
                              {' '}
                              {item.counterpart_account_name}
                            </>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">
                        <FormattedNumber value={item.original_amount} type="currency" className="font-medium" />
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${item.balance === 0 ? 'text-muted-foreground' : 'font-medium'}`}>
                        <FormattedNumber value={item.balance} type="currency" />
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                        {item.status === 'VOIDED' && item.voided_at && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(item.voided_at)}
                            {item.voided_reason && (
                              <span className="block truncate max-w-[120px]" title={item.voided_reason}>
                                {item.voided_reason}
                              </span>
                            )}
                          </div>
                        )}
                        {item.status === 'REFUNDED' && item.refunded_at && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(item.refunded_at)}
                            {item.refunded_reason && (
                              <span className="block truncate max-w-[120px]" title={item.refunded_reason}>
                                {item.refunded_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setDetailId(item.id)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
              {list.total} resultado(s) — Pagina {list.page} de {list.totalPages}
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

        <CreatePrepaymentModal open={showCreateModal} onOpenChange={setShowCreateModal} onSuccess={list.refetch} />

        <PrepaymentDetailModal
          prepaymentId={detailId}
          open={!!detailId}
          onClose={() => setDetailId(null)}
          onSuccess={list.refetch}
        />
      </div>
    </ProtectedRoute>
  );
}
