'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import type { AccountingPeriod } from '../types/accountingPeriods';

type ActionType = 'close' | 'reopen';

interface PeriodConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  period: AccountingPeriod | null;
  actionType: ActionType;
}

const ACTION_CONFIG: Record<ActionType, {
  title: string;
  description: string;
  icon: typeof Lock;
  iconColor: string;
  buttonText: string;
  buttonVariant: 'destructive' | 'default';
  placeholder: string;
}> = {
  close: {
    title: 'Cerrar Período',
    description: 'Al cerrar este período, no se podrán registrar movimientos contables dentro de sus fechas. Esta acción puede revertirse con la reapertura.',
    icon: Lock,
    iconColor: 'text-red-500',
    buttonText: 'Cerrar Período',
    buttonVariant: 'destructive',
    placeholder: 'Ej: Cierre mensual de enero, cierre anual fiscal...',
  },
  reopen: {
    title: 'Reabrir Período',
    description: 'Al reabrir este período, se permitirán nuevamente movimientos contables. Se creará una acción de ajuste en el período siguiente.',
    icon: Unlock,
    iconColor: 'text-amber-500',
    buttonText: 'Reabrir Período',
    buttonVariant: 'default',
    placeholder: 'Ej: Corrección de asiento, ajuste de cierre...',
  },
};

export function PeriodConfirmModal({
  open,
  onClose,
  onConfirm,
  period,
  actionType,
}: PeriodConfirmModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = ACTION_CONFIG[actionType];
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('La razón es requerida');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al procesar la acción';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  if (!period) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-100 dark:bg-slate-800 ${config.iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {period.name} ({period.consecutive})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {config.description}
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Razón <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={config.placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Esta razón quedará registrada en el historial de acciones del período.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={config.buttonVariant}
              disabled={loading || !reason.trim()}
            >
              {loading ? 'Procesando...' : config.buttonText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
