'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, Eye, Search, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useDocuments } from '../hooks/useDocuments';
import { DocumentListItem, DocType, DocumentStatus, SentToApi } from '../types';

const VIEW_DETAIL_PERMISSION: Record<DocType, string> = {
  INVOICE: 'sales.invoices.view_detail',
  INVOICE_CREDIT_NOTE: 'sales.credit_notes.view_detail',
  INVOICE_DEBIT_NOTE: 'sales.debit_notes.view_detail',
};

// --- Badge styling maps ---

const DOC_TYPE_CONFIG: Record<DocType, { label: string; className: string }> = {
  INVOICE: {
    label: 'Factura',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  },
  INVOICE_CREDIT_NOTE: {
    label: 'Nota Crédito',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  },
  INVOICE_DEBIT_NOTE: {
    label: 'Nota Débito',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
};

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Borrador',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  PENDING: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  PAID: {
    label: 'Pagada',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
};

const DIAN_CONFIG: Record<SentToApi, { label: string; className: string }> = {
  NOT_SENT: {
    label: 'No enviado',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  SUCCESS: {
    label: 'Enviado',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  ERROR: {
    label: 'Error',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
};

// --- Filter options ---

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'INVOICE', label: 'Factura' },
  { value: 'INVOICE_CREDIT_NOTE', label: 'Nota Crédito' },
  { value: 'INVOICE_DEBIT_NOTE', label: 'Nota Débito' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagada' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DocumentsTable() {
  const router = useRouter();
  const docs = useDocuments();
  const { can } = usePermissions();
  const { hasModule } = useCompanyModules();
  const showDian = hasModule('electronic_documents');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') docs.submitSearch();
  };

  const renderRow = (doc: DocumentListItem, isChild = false) => {
    const hasChildren = !isChild && (doc.referencing_docs?.length ?? 0) > 0;
    const isExpanded = expanded.has(doc.id);
    const typeConfig = DOC_TYPE_CONFIG[doc.doc_type];
    const statusConfig = STATUS_CONFIG[doc.status];
    const dianConfig = DIAN_CONFIG[doc.sent_to_api];

    return (
      <TableRow
        key={doc.id}
        className={isChild ? 'bg-gray-50/50 dark:bg-slate-800/30 border-t-0' : 'hover:bg-muted/50'}
      >
        {/* Expand */}
        <TableCell className={`w-8 ${isChild ? 'pl-4' : ''}`}>
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(doc.id)}
              className="p-0.5 rounded hover:bg-muted"
            >
              {isExpanded
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </button>
          ) : isChild ? (
            <span className="inline-block w-4" />
          ) : null}
        </TableCell>

        {/* Consecutivo */}
        <TableCell className={`font-mono text-sm ${isChild ? 'pl-4' : ''}`}>
          {doc.consecutive || '—'}
        </TableCell>

        {/* Tipo */}
        <TableCell>
          <Badge variant="secondary" className={typeConfig.className}>
            {typeConfig.label}
          </Badge>
        </TableCell>

        {/* Fecha */}
        <TableCell className="text-sm">{formatDate(doc.doc_date)}</TableCell>

        {/* Vencimiento */}
        <TableCell className="text-sm">{formatDate(doc.due_date)}</TableCell>

        {/* Tercero */}
        <TableCell className="text-sm max-w-[200px] truncate">
          {doc.third_party?.name || '—'}
        </TableCell>

        {/* NIT */}
        <TableCell className="font-mono text-sm">
          {doc.third_party?.identification_number || '—'}
        </TableCell>

        {/* Subtotal */}
        <TableCell className="text-right text-sm">
          <FormattedNumber value={doc.subtotal} type="currency" />
        </TableCell>

        {/* Impuestos */}
        <TableCell className="text-right text-sm">
          <FormattedNumber value={doc.total_taxes} type="currency" />
        </TableCell>

        {/* Retenciones */}
        <TableCell className="text-right text-sm">
          <FormattedNumber value={doc.total_withholdings} type="currency" />
        </TableCell>

        {/* Total */}
        <TableCell className="text-right text-sm font-bold">
          <FormattedNumber value={doc.net_amount} type="currency" />
        </TableCell>

        {/* Estado */}
        <TableCell>
          <Badge variant="secondary" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </TableCell>

        {/* DIAN */}
        {showDian && (
          <TableCell>
            <Badge variant="secondary" className={dianConfig.className}>
              {dianConfig.label}
            </Badge>
          </TableCell>
        )}

        {/* Acciones */}
        <TableCell>
          {can(VIEW_DETAIL_PERMISSION[doc.doc_type]) && (
            <span
              role="button"
              title="Ver detalle"
              className="cursor-pointer inline-flex"
              onClick={() => router.push(`/dashboard/invoices/${doc.id}`)}
            >
              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] max-w-[320px]">
          <Input
            placeholder="Buscar por consecutivo, tercero o NIT..."
            value={docs.search}
            onChange={(e) => docs.setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={docs.submitSearch} className="h-9">
          <Search className="h-4 w-4 mr-1" />
          Buscar
        </Button>
        <div className="w-40">
          <SearchableSelect
            options={DOC_TYPE_OPTIONS}
            value={docs.docType}
            onChange={(v) => {
              docs.setDocType(v as DocType | '');
              docs.submitSearch();
            }}
            placeholder="Tipo doc."
            className="h-9 [&_button]:h-9 [&_button]:text-sm"
          />
        </div>
        <div className="w-36">
          <SearchableSelect
            options={STATUS_OPTIONS}
            value={docs.status}
            onChange={(v) => {
              docs.setStatus(v as DocumentStatus | '');
              docs.submitSearch();
            }}
            placeholder="Estado"
            className="h-9 [&_button]:h-9 [&_button]:text-sm"
          />
        </div>
        <div className="w-40">
          <DatePicker
            value={docs.fromDate}
            onChange={(v) => {
              docs.setFromDate(v);
              docs.submitSearch();
            }}
            placeholder="Desde"
            clearable
          />
        </div>
        <div className="w-40">
          <DatePicker
            value={docs.toDate}
            onChange={(v) => {
              docs.setToDate(v);
              docs.submitSearch();
            }}
            placeholder="Hasta"
            clearable
          />
        </div>
      </div>

      {/* Error */}
      {docs.error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-3">
          {docs.error}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Consecutivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Tercero</TableHead>
              <TableHead>NIT</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Impuestos</TableHead>
              <TableHead className="text-right">Retenciones</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              {showDian && <TableHead>DIAN</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.loading ? (
              <TableRow>
                <TableCell colSpan={showDian ? 14 : 13} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : docs.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showDian ? 14 : 13} className="h-32 text-center text-muted-foreground">
                  No se encontraron documentos
                </TableCell>
              </TableRow>
            ) : (
              docs.items.map((doc) => (
                <React.Fragment key={doc.id}>
                  {renderRow(doc)}
                  {expanded.has(doc.id) &&
                    doc.referencing_docs?.map((child) => renderRow(child, true))
                  }
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {docs.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{docs.total} documento(s) en total</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={docs.page <= 1}
              onClick={() => docs.goToPage(docs.page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm py-1 px-2">
              Pág. {docs.page} de {docs.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={docs.page >= docs.totalPages}
              onClick={() => docs.goToPage(docs.page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
