'use client';

import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { DocumentDetailView } from '@/modules/invoicing';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <ProtectedRoute module="sales">
      <DocumentDetailView documentId={id} />
    </ProtectedRoute>
  );
}
