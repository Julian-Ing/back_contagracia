'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { DocumentForm } from '@/modules/invoicing';

export default function NewInvoicePage() {
  return (
    <ProtectedRoute permission="sales.invoices.create" module="sales">
      <DocumentForm mode="create" />
    </ProtectedRoute>
  );
}
