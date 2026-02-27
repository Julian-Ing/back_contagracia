'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import { Edit, Plus } from 'lucide-react';
import { JournalEntriesList } from '@/modules/accounting/components/JournalEntriesList';

export default function JournalEntriesPage() {
  const { can } = usePermissions();
  const canCreate = can('journal_entries.create');

  return (
    <ProtectedRoute permission="journal_entries.view" deniedMessage="No tienes permisos para ver los Asientos Contables.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-amber-500 text-white">
                <Edit className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asientos Contables</h1>
                <p className="text-sm text-muted-foreground">Consulta y crea asientos contables.</p>
              </div>
            </div>
            {canCreate && (
              <Link href="/dashboard/accounting/journal-entries/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Asiento
                </Button>
              </Link>
            )}
          </div>
        </header>

        <JournalEntriesList />
      </div>
    </ProtectedRoute>
  );
}
