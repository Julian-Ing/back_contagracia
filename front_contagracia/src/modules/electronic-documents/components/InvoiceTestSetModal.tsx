'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { electronicDocsClient } from '@/shared/services/api/apiClient';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface Step {
  label: string;
  status: StepStatus;
  message?: string;
}

interface InvoiceTestSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSetId: string;
}

const STEPS_CONFIG = [
  'Registrando resolución SETP en DIAN',
  'Enviando factura de prueba',
  'Consultando estado en DIAN',
  'Importando resoluciones de producción',
  'Cambiando ambiente a producción',
];

const BASE_CONSECUTIVE = 990000000;
const MAX_CONSECUTIVE = 995000000;

export const InvoiceTestSetModal = ({
  open,
  onOpenChange,
  testSetId,
}: InvoiceTestSetModalProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState('1');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [steps, setSteps] = useState<Step[]>(
    STEPS_CONFIG.map((label) => ({ label, status: 'pending' })),
  );

  const progress = steps.filter((s) => s.status === 'success').length;
  const progressPercent = Math.round((progress / steps.length) * 100);

  const updateStep = (index: number, status: StepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status, message } : s)),
    );
  };

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleStart = useCallback(async () => {
    const num = Number(invoiceNumber);
    if (!invoiceNumber || isNaN(num) || num < 1) {
      toast.error('El número de factura debe ser mayor a 0');
      return;
    }
    const consecutive = BASE_CONSECUTIVE + num;
    if (consecutive > MAX_CONSECUTIVE) {
      toast.error(`El consecutivo resultante (${consecutive.toLocaleString()}) excede el máximo permitido (${MAX_CONSECUTIVE.toLocaleString()})`);
      return;
    }

    setStarted(true);
    setFinished(false);
    setSteps(STEPS_CONFIG.map((label) => ({ label, status: 'pending' })));

    try {
      // Paso 1: Registrar resolución SETP
      updateStep(0, 'running');
      const res1 = await electronicDocsClient.post('/test-set/invoice/register-resolution');
      updateStep(0, 'success', res1.data.message);

      // Paso 2: Enviar factura de prueba
      updateStep(1, 'running');
      const res2 = await electronicDocsClient.post('/test-set/invoice/send', { consecutive });
      const zipKey = res2.data.zipKey;
      updateStep(1, 'success', `ZipKey: ${zipKey}`);

      if (!zipKey) {
        updateStep(1, 'error', 'No se obtuvo ZipKey de la respuesta');
        setFinished(true);
        return;
      }

      // Paso 3: Consultar estado (polling)
      updateStep(2, 'running', 'Consultando...');
      let statusOk = false;
      let attempts = 0;
      const maxAttempts = 10;
      let lastMessage = '';

      while (!statusOk && attempts < maxAttempts) {
        attempts++;
        try {
          const res3 = await electronicDocsClient.post(`/test-set/invoice/status/${zipKey}`);
          const statusDescription = res3.data.statusDescription || res3.data.message || '';
          const statusCode = res3.data.statusCode;
          lastMessage = statusDescription;

          updateStep(2, 'running', `Intento ${attempts}: ${statusDescription}`);

          if (statusCode === '00' || statusDescription?.toLowerCase().includes('procesado')) {
            statusOk = true;
            updateStep(2, 'success', statusDescription);
          } else if (
            statusCode === '99' ||
            statusDescription?.toLowerCase().includes('no se encuentra') ||
            statusDescription?.toLowerCase().includes('rechazad') ||
            statusDescription?.toLowerCase().includes('no está habilitad')
          ) {
            updateStep(2, 'error', statusDescription);
            toast.error(statusDescription);
            setFinished(true);
            return;
          } else {
            await delay(3000);
          }
        } catch (pollError: any) {
          const msg = pollError?.response?.data?.message || pollError.message || 'Error desconocido';
          // Error del API = error definitivo, no reintentar
          updateStep(2, 'error', msg);
          setFinished(true);
          return;
        }
      }

      if (!statusOk) {
        updateStep(2, 'error', lastMessage || `Sin respuesta después de ${maxAttempts} intentos`);
        setFinished(true);
        return;
      }

      // Paso 4: Importar resoluciones de producción
      updateStep(3, 'running');
      const res4 = await electronicDocsClient.post('/test-set/invoice/import-resolutions');
      updateStep(3, 'success', res4.data.message || 'Resoluciones importadas');

      // Paso 5: Cambiar ambiente a producción
      updateStep(4, 'running');
      const res5 = await electronicDocsClient.patch('/environment/invoice/production');
      updateStep(4, 'success', res5.data.message || 'Ambiente cambiado a producción');

      toast.success('Facturación habilitada en producción');
      setFinished(true);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Error inesperado';
      const failedIndex = steps.findIndex((s) => s.status === 'running');
      if (failedIndex >= 0) {
        updateStep(failedIndex, 'error', msg);
      }
      toast.error(msg);
      setFinished(true);
    }
  }, [invoiceNumber, steps]);

  const handleClose = (open: boolean) => {
    if (!open && started && !finished) return; // No cerrar mientras corre
    if (!open) {
      // Reset al cerrar
      setStarted(false);
      setFinished(false);
      setInvoiceNumber('1');
      setSteps(STEPS_CONFIG.map((label) => ({ label, status: 'pending' })));
    }
    onOpenChange(open);
  };

  const allSuccess = steps.every((s) => s.status === 'success');
  const hasError = steps.some((s) => s.status === 'error');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => { if (started && !finished) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="text-base">
            Habilitando Test Set ID {testSetId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Input consecutivo - solo antes de iniciar */}
          {!started && (
            <div className="space-y-2">
              <Label className="text-sm">
                Número de factura a enviar
              </Label>
              <Input
                type="number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="h-9"
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Se enviará como SETP{(BASE_CONSECUTIVE + (Number(invoiceNumber) || 0)).toLocaleString()}
              </p>
              <Button
                onClick={handleStart}
                disabled={!invoiceNumber}
                className="w-full"
              >
                Iniciar validación
              </Button>
            </div>
          )}

          {/* Progress bar */}
          {started && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    hasError ? 'bg-red-500' : allSuccess ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Lista de pasos */}
          {started && (
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {step.status === 'pending' && <Circle className="h-4 w-4 text-muted-foreground" />}
                    {step.status === 'running' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                    {step.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {step.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      step.status === 'running' ? 'font-medium text-blue-600' :
                      step.status === 'success' ? 'text-green-700' :
                      step.status === 'error' ? 'text-red-600' :
                      'text-muted-foreground'
                    }`}>
                      {step.label}
                    </p>
                    {step.message && (
                      <p className={`text-xs mt-0.5 ${
                        step.status === 'error' ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {step.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botón cerrar cuando termina */}
          {finished && (
            <Button
              variant={allSuccess ? 'default' : 'outline'}
              onClick={() => handleClose(false)}
              className="w-full"
            >
              {allSuccess ? 'Listo' : 'Cerrar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
