'use client';

import { useState } from 'react';
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
import { bankAccountsService } from '../services/bankAccounts.service';
import type { BankAccount } from '../types';

interface DeleteBankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: BankAccount | null;
  onSuccess: () => void;
}

export function DeleteBankAccountModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: DeleteBankAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!account) return;

    setError(null);
    setLoading(true);

    try {
      await bankAccountsService.delete(account.id);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al eliminar';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Eliminar Cuenta Bancaria
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                ¿Estás seguro de eliminar la cuenta <strong>{account.account_name}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                Esta acción no se puede deshacer. Solo se puede eliminar si la cuenta no tiene movimientos.
              </p>
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
