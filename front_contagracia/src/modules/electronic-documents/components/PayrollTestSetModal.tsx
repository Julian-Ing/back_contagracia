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

interface PayrollTestSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSetId: string;
}

const TOTAL_PAYROLLS = 10;
const TOTAL_NOTES = 8;

const buildSteps = (pPrefix = 'TNI', nPrefix = 'TNA'): Step[] => [
  { label: `Registrando resoluciones ${pPrefix} y ${nPrefix} en DIAN`, status: 'pending' },
  { label: `Enviando ${TOTAL_PAYROLLS} nóminas de prueba (${pPrefix})`, status: 'pending' },
  { label: `Enviando ${TOTAL_NOTES} notas de ajuste (${nPrefix})`, status: 'pending' },
  { label: 'Creando resoluciones NI y NA de producción', status: 'pending' },
  { label: 'Cambiando ambiente a producción', status: 'pending' },
];

export const PayrollTestSetModal = ({
  open,
  onOpenChange,
  testSetId,
}: PayrollTestSetModalProps) => {
  const [payrollPrefix, setPayrollPrefix] = useState('TNI');
  const [notePrefix, setNotePrefix] = useState('TNA');
  const [payrollStart, setPayrollStart] = useState('1');
  const [noteStart, setNoteStart] = useState('1');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [steps, setSteps] = useState<Step[]>(buildSteps());

  // Progreso granular: paso 1 = 5%, paso 2 = 45%, paso 3 = 35%, paso 4 = 5%, paso 5 = 10%
  const getProgress = () => {
    let pct = 0;
    if (steps[0].status === 'success') pct += 5;
    if (steps[1].status === 'success') pct += 45;
    else if (steps[1].status === 'running' && steps[1].message) {
      const match = steps[1].message.match(/(\d+)\/\d+/);
      if (match) pct += Math.round((Number(match[1]) / TOTAL_PAYROLLS) * 45);
    }
    if (steps[2].status === 'success') pct += 35;
    else if (steps[2].status === 'running' && steps[2].message) {
      const match = steps[2].message.match(/(\d+)\/\d+/);
      if (match) pct += Math.round((Number(match[1]) / TOTAL_NOTES) * 35);
    }
    if (steps[3].status === 'success') pct += 5;
    if (steps[4].status === 'success') pct += 10;
    return Math.min(pct, 100);
  };

  const progressPercent = getProgress();

  const updateStep = (index: number, status: StepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status, message } : s)),
    );
  };

  const handleStart = useCallback(async () => {
    const payrollConsecutive = Number(payrollStart);
    const noteConsecutive = Number(noteStart);

    if (!payrollConsecutive || payrollConsecutive < 1) {
      toast.error('El consecutivo de nómina debe ser mayor a 0');
      return;
    }
    if (!noteConsecutive || noteConsecutive < 1) {
      toast.error('El consecutivo de anulación debe ser mayor a 0');
      return;
    }

    setStarted(true);
    setFinished(false);
    setSteps(buildSteps(payrollPrefix, notePrefix));

    // Guardar CUNEs para las notas de ajuste
    const predecessors: { consecutive: number; cune: string; issueDate: string }[] = [];

    try {
      // Paso 1: Registrar resoluciones
      updateStep(0, 'running');
      const res1 = await electronicDocsClient.post('/test-set/payroll/register-resolutions', {
        payroll_prefix: payrollPrefix,
        note_prefix: notePrefix,
      });
      updateStep(0, 'success', res1.data.message);

      // Paso 2: Enviar 10 nóminas
      updateStep(1, 'running', `0/${TOTAL_PAYROLLS}`);

      for (let i = 0; i < TOTAL_PAYROLLS; i++) {
        const consecutive = payrollConsecutive + i;
        updateStep(1, 'running', `${i}/${TOTAL_PAYROLLS} - Enviando ${payrollPrefix}${consecutive}...`);

        const res = await electronicDocsClient.post('/test-set/payroll/send', {
          consecutive,
          prefix: payrollPrefix,
        });

        predecessors.push({
          consecutive,
          cune: res.data.cune,
          issueDate: res.data.issueDate,
        });

        updateStep(1, 'running', `${i + 1}/${TOTAL_PAYROLLS} - ${payrollPrefix}${consecutive} OK`);
      }

      updateStep(1, 'success', `${TOTAL_PAYROLLS} nóminas enviadas`);

      // Paso 3: Enviar 8 notas de ajuste
      updateStep(2, 'running', `0/${TOTAL_NOTES}`);

      for (let i = 0; i < TOTAL_NOTES; i++) {
        const consecutive = noteConsecutive + i;
        const pred = predecessors[i];

        updateStep(2, 'running', `${i}/${TOTAL_NOTES} - Enviando ${notePrefix}${consecutive}...`);

        await electronicDocsClient.post('/test-set/payroll/send-adjust-note', {
          consecutive,
          prefix: notePrefix,
          predecessor_number: pred.consecutive,
          predecessor_cune: pred.cune,
          predecessor_issue_date: pred.issueDate,
        });

        updateStep(2, 'running', `${i + 1}/${TOTAL_NOTES} - ${notePrefix}${consecutive} OK`);
      }

      updateStep(2, 'success', `${TOTAL_NOTES} notas de ajuste enviadas`);

      // Paso 4: Crear resoluciones NI y NA de producción
      updateStep(3, 'running');
      const res4 = await electronicDocsClient.post('/test-set/payroll/create-production-resolutions');
      updateStep(3, 'success', res4.data.message);

      // Paso 5: Cambiar ambiente a producción
      updateStep(4, 'running');
      const res5 = await electronicDocsClient.patch('/environment/payroll/production');
      updateStep(4, 'success', res5.data.message || 'Ambiente cambiado a producción');

      toast.success('Nómina habilitada en producción');
      setFinished(true);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Error inesperado';
      const failedIndex = steps.findIndex((s) => s.status === 'running');
      if (failedIndex >= 0) {
        // Preserve progress info in error message
        const currentMsg = steps[failedIndex].message;
        const prefix = currentMsg ? `${currentMsg} - ` : '';
        updateStep(failedIndex, 'error', `${prefix}${msg}`);
      }
      toast.error(msg);
      setFinished(true);
    }
  }, [payrollPrefix, notePrefix, payrollStart, noteStart, steps]);

  const handleClose = (open: boolean) => {
    if (!open && started && !finished) return;
    if (!open) {
      setStarted(false);
      setFinished(false);
      setPayrollPrefix('TNI');
      setNotePrefix('TNA');
      setPayrollStart('1');
      setNoteStart('1');
      setSteps(buildSteps(payrollPrefix, notePrefix));
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
          {/* Inputs - solo antes de iniciar */}
          {!started && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Prefijo nómina</Label>
                  <Input
                    value={payrollPrefix}
                    onChange={(e) => setPayrollPrefix(e.target.value.toUpperCase())}
                    className="h-9"
                    placeholder="TNI"
                  />
                </div>
                <div>
                  <Label className="text-sm">Prefijo anulación</Label>
                  <Input
                    value={notePrefix}
                    onChange={(e) => setNotePrefix(e.target.value.toUpperCase())}
                    className="h-9"
                    placeholder="TNA"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Consecutivo nómina (desde)</Label>
                  <Input
                    type="number"
                    value={payrollStart}
                    onChange={(e) => setPayrollStart(e.target.value)}
                    className="h-9"
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enviará {TOTAL_PAYROLLS} nóminas ({payrollPrefix})
                  </p>
                </div>
                <div>
                  <Label className="text-sm">Consecutivo anulación (desde)</Label>
                  <Input
                    type="number"
                    value={noteStart}
                    onChange={(e) => setNoteStart(e.target.value)}
                    className="h-9"
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enviará {TOTAL_NOTES} notas ({notePrefix})
                  </p>
                </div>
              </div>
              <Button onClick={handleStart} disabled={!payrollPrefix || !notePrefix} className="w-full">
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
                  className={`h-full rounded-full transition-all duration-300 ${
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

          {/* Botón cerrar */}
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
