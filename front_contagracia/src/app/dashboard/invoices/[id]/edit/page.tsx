'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/shared/components/auth';
import { DocumentForm, documentsService } from '@/modules/invoicing';
import type { DocumentDetail } from '@/modules/invoicing';

export default function EditInvoicePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await documentsService.getById(id);
        if (cancelled) return;
        if (data.status !== 'DRAFT') {
          toast.error('Solo se pueden editar facturas en estado Borrador');
          router.replace(`/dashboard/invoices/${id}`);
          return;
        }
        setDoc(data);
      } catch {
        if (!cancelled) {
          toast.error('Error al cargar la factura');
          router.replace('/dashboard/invoices');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <ProtectedRoute
      permission="sales.invoices.edit"
      module="sales"
      deniedMessage="No tienes permisos para editar facturas."
    >
      <DocumentForm mode="edit" documentId={id} initialData={doc} />
    </ProtectedRoute>
  );
}
