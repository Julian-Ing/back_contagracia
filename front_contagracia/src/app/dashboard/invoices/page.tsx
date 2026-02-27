'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { DocumentsTable } from '@/modules/invoicing';

export default function InvoicesPage() {
  const { can } = usePermissions();
  const canCreate = can('sales.invoices.create');

  return (
    <ProtectedRoute permission="sales.invoices.view" module="sales">
      <div className="p-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facturas de Venta</h1>
              <p className="text-sm text-muted-foreground">Gestiona tus facturas electrónicas, notas crédito y notas débito.</p>
            </div>
          </div>
          {canCreate && (
            <Link href="/dashboard/invoices/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </Link>
          )}
        </header>

        <DocumentsTable />
      </div>
    </ProtectedRoute>
  );
}
