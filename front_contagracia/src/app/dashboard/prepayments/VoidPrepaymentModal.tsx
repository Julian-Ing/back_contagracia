'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { prepaymentsService } from '@/modules/ar-ap/services/prepayments.service';

interface VoidPrepaymentModalProps {
  prepaymentId: string;
  consecutive: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoidPrepaymentModal({ prepaymentId, consecutive, open, onClose, onSuccess }: VoidPrepaymentModalProps) {
  const [voidDate, setVoidDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!voidDate) return toast.error('Selecciona la fecha de anulacion');

    setSubmitting(true);
    try {
      await prepaymentsService.voidPrepayment(prepaymentId, {
        void_date: voidDate,
        reason: reason.trim() || undefined,
      });
      toast.success('Anticipo anulado exitosamente');
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al anular el anticipo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setVoidDate(new Date().toISOString().slice(0, 10));
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Anular anticipo
          </DialogTitle>
          <DialogDescription>
            Esta accion reversara el asiento contable y el movimiento bancario asociado.
            {consecutive && <span className="font-medium"> Anticipo {consecutive}.</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Fecha de anulacion *</Label>
            <DatePicker
              value={voidDate}
              onChange={setVoidDate}
              placeholder="Seleccionar fecha..."
            />
            <p className="text-xs text-muted-foreground">
              El periodo contable de esta fecha debe estar abierto.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Razon de anulacion</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo de la anulacion..."
              rows={3}
              className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Anulando...
                </>
              ) : (
                'Anular anticipo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
