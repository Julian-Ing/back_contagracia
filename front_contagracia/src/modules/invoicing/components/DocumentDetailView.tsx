'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, FileText, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { AccessDenied } from '@/shared/components/auth';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { documentsService } from '../services/documents.service';
import type { DocumentDetail, DocType, DocumentStatus, SentToApi } from '../types';

/* ── Config maps ── */

const DOC_TYPE_LABEL: Record<DocType, string> = {
  INVOICE: 'Factura de Venta',
  INVOICE_CREDIT_NOTE: 'Nota Crédito',
  INVOICE_DEBIT_NOTE: 'Nota Débito',
};

const VIEW_DETAIL_PERMISSION: Record<DocType, string> = {
  INVOICE: 'sales.invoices.view_detail',
  INVOICE_CREDIT_NOTE: 'sales.credit_notes.view_detail',
  INVOICE_DEBIT_NOTE: 'sales.debit_notes.view_detail',
};

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Borrador', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  PENDING: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  PAID: { label: 'Pagada', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
};

const DIAN_CONFIG: Record<SentToApi, { label: string; className: string }> = {
  NOT_SENT: { label: 'No enviado', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  SUCCESS: { label: 'Enviado', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  ERROR: { label: 'Error', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Props ── */

export interface DocumentDetailViewProps {
  documentId: string;
}

/* ── Component ── */

export function DocumentDetailView({ documentId }: DocumentDetailViewProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const { hasModule } = useCompanyModules();
  const showDian = hasModule('electronic_documents');
  const hasCCModule = hasModule('cost_centers');
  const hasInventory = hasModule('inventory_management');

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    await documentsService.deleteDraft(documentId);
    toast.success('Borrador eliminado');
    router.replace('/dashboard/invoices');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await documentsService.getById(documentId);
        if (!cancelled) setDoc(data);
      } catch {
        if (!cancelled) {
          toast.error('Error al cargar el documento');
          router.replace('/dashboard/invoices');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [documentId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) return null;

  // Validate permission based on doc_type
  const requiredPermission = VIEW_DETAIL_PERMISSION[doc.doc_type];
  if (!can(requiredPermission)) {
    return <AccessDenied message={`No tienes permisos para ver el detalle de ${DOC_TYPE_LABEL[doc.doc_type]}.`} />;
  }

  const statusCfg = STATUS_CONFIG[doc.status];
  const isDraft = doc.status === 'DRAFT';
  // Only invoices can be edited (NC/ND don't have edit permission in seeder)
  const canEdit = doc.doc_type === 'INVOICE' && can('sales.invoices.edit');
  const canDelete = doc.doc_type === 'INVOICE' && can('sales.invoices.delete');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {DOC_TYPE_LABEL[doc.doc_type]} {doc.consecutive || ''}
            </h1>
            <p className="text-sm text-muted-foreground">
              {doc.third_party?.name || '—'}
              {doc.third_party?.identification_number && (
                <span className="ml-2 font-mono">({doc.third_party.identification_number})</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statusCfg.className}>{statusCfg.label}</Badge>
          {showDian && (
            <Badge variant="secondary" className={DIAN_CONFIG[doc.sent_to_api].className}>
              {DIAN_CONFIG[doc.sent_to_api].label}
            </Badge>
          )}
          {isDraft && canEdit && (
            <Link href={`/dashboard/invoices/${documentId}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </Link>
          )}
          {isDraft && canDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* General info */}
        <div className="border rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">General</h3>
          <InfoRow label="Fecha de Emisión" value={formatDate(doc.doc_date)} />
          {doc.due_date && <InfoRow label="Vencimiento" value={formatDate(doc.due_date)} />}
          <InfoRow label="Tipo de Pago" value={doc.payment_type === 'CASH' ? 'Contado' : doc.payment_type === 'CREDIT' ? 'Crédito' : '—'} />
          {doc.type_operation && (
            <InfoRow label="Tipo de Operación" value={`${doc.type_operation.code} - ${doc.type_operation.name}`} />
          )}
        </div>

        {/* Purchase order */}
        {(doc.purchase_order_consecutive || doc.notes) && (
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Referencia</h3>
            {doc.purchase_order_consecutive && (
              <InfoRow label="Orden de Compra" value={doc.purchase_order_consecutive} />
            )}
            {doc.purchase_order_date && (
              <InfoRow label="Fecha OC" value={formatDate(doc.purchase_order_date)} />
            )}
            {doc.notes && (
              <div>
                <span className="text-xs text-muted-foreground">Descripción</span>
                <p className="text-sm">{doc.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Credit */}
        {doc.credit && (
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Crédito</h3>
            <InfoRow label="Vencimiento" value={formatDate(doc.credit.due_date)} />
            {doc.credit.payment_method_name && (
              <InfoRow label="Medio de Pago" value={doc.credit.payment_method_name} />
            )}
            {doc.credit.cost_center_name && (
              <InfoRow label="Centro de Costos" value={doc.credit.cost_center_name} />
            )}
          </div>
        )}
      </div>

      {/* Items table */}
      {(() => {
        const AIU_IDS = ['aiu-administration', 'aiu-contingencies', 'aiu-utility'];
        const visibleItems = doc.items.filter(i => !i.product_id || !AIU_IDS.includes(i.product_id));
        return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ítems ({visibleItems.length})</h3>
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead>Impuesto</TableHead>
                <TableHead className="text-right">Imp. Valor</TableHead>
                {hasInventory && <TableHead>Bodega</TableHead>}
                {hasCCModule && <TableHead>Centro Costos</TableHead>}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="text-sm">{item.description || item.product_name || '—'}</div>
                    {item.product_consecutive && (
                      <span className="text-xs text-muted-foreground font-mono">{item.product_consecutive}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.quantity}
                    {item.unit_name && <span className="ml-1 text-xs text-muted-foreground">{item.unit_name}</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <FormattedNumber value={item.unit_price} type="currency" />
                    {item.tax_included && <span className="ml-1 text-xs text-muted-foreground">(IVA inc.)</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.discount_rate > 0 || item.discount_value > 0 ? (
                      <>
                        {item.is_discount_rate
                          ? <span>{item.discount_rate}%</span>
                          : <FormattedNumber value={item.discount_value} type="currency" />}
                        {' '}
                        <span className="text-xs text-muted-foreground">
                          (<FormattedNumber value={item.discount_total_value} type="currency" />)
                        </span>
                      </>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.tax_name || '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.tax_amount > 0 ? <FormattedNumber value={item.tax_amount} type="currency" /> : '—'}
                  </TableCell>
                  {hasInventory && (
                    <TableCell className="text-sm">{item.storage_name || '—'}</TableCell>
                  )}
                  {hasCCModule && (
                    <TableCell className="text-sm">{item.cost_center_name || '—'}</TableCell>
                  )}
                  <TableCell className="text-right text-sm font-medium">
                    <FormattedNumber value={item.total_price} type="currency" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
        );
      })()}

      {/* Payments */}
      {doc.payments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pagos ({doc.payments.length})</h3>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Medio de Pago</TableHead>
                  {hasCCModule && <TableHead>Centro Costos</TableHead>}
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {p.prepayment_id ? (
                        <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300">Anticipo</Badge>
                      ) : p.bank_account_type === 'cash' ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Caja</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Banco</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.prepayment_id
                        ? (p.prepayment_consecutive || '—')
                        : (p.bank_account_name || '—')}
                    </TableCell>
                    <TableCell className="text-sm">{p.company_payment_method_name || '—'}</TableCell>
                    {hasCCModule && (
                      <TableCell className="text-sm">{p.cost_center_name || '—'}</TableCell>
                    )}
                    <TableCell className="text-right text-sm font-medium">
                      <FormattedNumber value={p.amount} type="currency" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Withholdings */}
      {doc.withholdings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Retenciones ({doc.withholdings.length})</h3>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Retención</TableHead>
                  <TableHead className="text-right">Tasa</TableHead>
                  {hasCCModule && <TableHead>Centro Costos</TableHead>}
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.withholdings.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">{w.withholding_name || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{w.rate}%</TableCell>
                    {hasCCModule && (
                      <TableCell className="text-sm">{w.cost_center_name || '—'}</TableCell>
                    )}
                    <TableCell className="text-right text-sm font-medium">
                      <FormattedNumber value={w.amount} type="currency" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* AIU */}
      {doc.aiu && (() => {
        const utilityItem = doc.items.find(i => i.product_id === 'aiu-utility');
        return (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">A.I.U.</h3>
            <div className="border rounded-lg p-4 grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Administración ({doc.aiu.administrative_percentage}%)</span>
                <p className="text-sm font-medium"><FormattedNumber value={doc.aiu.administrative} type="currency" /></p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Imprevistos ({doc.aiu.unexpected_percentage}%)</span>
                <p className="text-sm font-medium"><FormattedNumber value={doc.aiu.unexpected} type="currency" /></p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Utilidad ({doc.aiu.utility_percentage}%)</span>
                <p className="text-sm font-medium"><FormattedNumber value={doc.aiu.utility} type="currency" /></p>
                {utilityItem && utilityItem.tax_amount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    IVA ({utilityItem.tax_rate}%): <FormattedNumber value={utilityItem.tax_amount} type="currency" />
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm border rounded-lg p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <FormattedNumber value={doc.subtotal} type="currency" />
          </div>
          {doc.total_discounts > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Descuentos (-)</span>
              <FormattedNumber value={doc.total_discounts} type="currency" />
            </div>
          )}
          {doc.total_taxes > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Impuestos (+)</span>
              <FormattedNumber value={doc.total_taxes} type="currency" />
            </div>
          )}
          {doc.total_withholdings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Retenciones (-)</span>
              <FormattedNumber value={doc.total_withholdings} type="currency" />
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5 font-bold">
            <span>Total a Pagar</span>
            <FormattedNumber value={doc.net_amount} type="currency" />
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="text-xs text-muted-foreground text-right">
        Creado: {formatDate(doc.created_at)} · Actualizado: {formatDate(doc.updated_at)}
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Eliminar Borrador"
        description={`¿Está seguro de eliminar el borrador ${doc.consecutive || ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

/* ── Helpers ── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
