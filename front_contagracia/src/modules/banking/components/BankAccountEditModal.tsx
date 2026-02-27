'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { bankAccountsService } from '../services/bankAccounts.service';
import type { BankAccount } from '../types';

interface BankAccountEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: BankAccount | null;
  hasAccountingModule: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  onSuccess: () => void;
}

export function BankAccountEditModal({
  open,
  onOpenChange,
  account,
  hasAccountingModule,
  canActivate,
  canDeactivate,
  onSuccess,
}: BankAccountEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accountIdLabel, setAccountIdLabel] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && account) {
      setAccountName(account.account_name);
      setAccountNumber(account.account_number || '');
      setAccountId(account.account_id || '');
      setAccountIdLabel(account.account_id ? `${account.account_id}` : '');
      setIsActive(account.is_active);
      setError(null);
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setError(null);
    setLoading(true);

    try {
      // Solo enviar is_active si tiene permiso para cambiarla
      const canChangeStatus = (account.is_active && canDeactivate) || (!account.is_active && canActivate);

      await bankAccountsService.update(account.id, {
        account_name: accountName,
        account_number: accountNumber || undefined,
        account_id: accountId || undefined,
        ...(canChangeStatus && { is_active: isActive }),
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  const isCash = account.account_type === 'CASH';
  const accountPrefix = isCash ? '1105' : '1110';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cuenta Bancaria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="account_name">Nombre</Label>
            <Input
              id="account_name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
            />
          </div>

          {!isCash && (
            <div className="space-y-2">
              <Label htmlFor="account_number">Número de Cuenta</Label>
              <Input
                id="account_number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Número de cuenta bancaria"
              />
            </div>
          )}

          {hasAccountingModule && (
            <div className="space-y-2">
              <Label>Cuenta Contable</Label>
              <AccountSelect
                value={accountId}
                valueLabel={accountIdLabel}
                onChange={(code, acc) => {
                  setAccountId(code);
                  setAccountIdLabel(acc ? `${acc.code} - ${acc.name}` : '');
                }}
                placeholder="Seleccionar cuenta..."
                includePrefixes={accountPrefix}
              />
            </div>
          )}

          {/* Estado - solo mostrar si tiene permiso correspondiente */}
          {((account.is_active && canDeactivate) || (!account.is_active && canActivate)) && (
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Estado</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isActive ? 'Cuenta activa' : 'Cuenta inactiva'}
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
