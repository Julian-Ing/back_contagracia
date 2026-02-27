'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { taxesService } from '../services/taxes.service';
import type { Tax, CanDeleteResponse } from '../types';

interface DeleteTaxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax: Tax | null;
  onSuccess: () => void;
}

export function DeleteTaxModal({ open, onOpenChange, tax, onSuccess }: DeleteTaxModalProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canDeleteInfo, setCanDeleteInfo] = useState<CanDeleteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkCanDelete = async () => {
      if (!tax || !open) return;
      setChecking(true);
      setCanDeleteInfo(null);
      setError(null);

      try {
        const info = await taxesService.canDelete(tax.id);
        setCanDeleteInfo(info);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al verificar');
      } finally {
        setChecking(false);
      }
    };

    checkCanDelete();
  }, [tax, open]);

  const handleDelete = async () => {
    if (!tax) return;
    setLoading(true);
    setError(null);

    try {
      await taxesService.delete(tax.id);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const is_tax = tax?.tax_type?.is_tax;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Eliminar {is_tax ? 'Impuesto' : 'Retención'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {checking ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando si se puede eliminar...
              </div>
            ) : error ? (
              <div className="text-red-600 py-2">{error}</div>
            ) : canDeleteInfo?.canDelete ? (
              <div className="space-y-2">
                <p>
                  ¿Estás seguro de que deseas eliminar <strong>{tax?.name}</strong>?
                </p>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600 font-medium">
                  No se puede eliminar {tax?.name}
                </p>
                <p className="text-sm">{canDeleteInfo?.reason}</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          {canDeleteInfo?.canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || checking}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
