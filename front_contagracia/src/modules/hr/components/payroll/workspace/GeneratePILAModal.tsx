'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Badge } from '@/shared/components/ui/badge';
import { FileText, Download, Loader2, CheckCircle, Users, Calendar } from 'lucide-react';
import { payrollSettlementsService } from '../../../services/payroll-settlements.service';
import type { PayrollSettlement, PilaGenerationResult } from '../../../types';
import toast from 'react-hot-toast';

interface GeneratePILAModalProps {
  open: boolean;
  onClose: () => void;
  settlement: PayrollSettlement;
}

export function GeneratePILAModal({ open, onClose, settlement }: GeneratePILAModalProps) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PilaGenerationResult | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await payrollSettlementsService.generatePila(settlement.id);
      setResult(data);
      toast.success('Archivo PILA generado exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al generar archivo PILA');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.file_content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Generar Archivo PILA
          </DialogTitle>
        </DialogHeader>

        {/* Settlement info */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Liquidacion
                </span>
                <p className="font-medium">{settlement.settlement_name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Periodo
                </span>
                <p className="font-medium">{settlement.year}-{String(settlement.month).padStart(2, '0')} Q{settlement.period_number}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Empleados
                </span>
                <p className="font-medium">{settlement.total_employees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!result ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Se generara un archivo PILA en formato texto plano con la informacion de aportes
              de todos los empleados incluidos en esta liquidacion.
            </p>
            <Button onClick={handleGenerate} disabled={generating} size="lg">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generar Archivo PILA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Archivo generado exitosamente</span>
            </div>

            <Card>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Archivo</span>
                  <Badge variant="outline">{result.file_name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Periodo</span>
                  <span className="text-sm font-medium">{result.period}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Empleados</span>
                  <span className="text-sm font-medium">{result.total_employees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Aportes</span>
                  <FormattedNumber value={result.total_contribution} type="currency" className="text-sm font-bold" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cerrar</Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
