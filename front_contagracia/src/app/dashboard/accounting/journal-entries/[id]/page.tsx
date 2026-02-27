'use client';

import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { JournalEntryDetail } from '@/modules/accounting/components/JournalEntryDetail';

export default function JournalEntryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <ProtectedRoute permission="journal_entries.view_detail" deniedMessage="No tienes permisos para ver el detalle de Asientos Contables.">
      <JournalEntryDetail entryId={id} mode="page" />
    </ProtectedRoute>
  );
}
