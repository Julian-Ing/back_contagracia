'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { FileText, User, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CrmOpportunity } from '../types';

interface QuoteFromOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: CrmOpportunity | null;
  onSuccess?: () => void;
}

export default function QuoteFromOpportunityModal({
  open,
  onOpenChange,
  opportunity,
  onSuccess,
}: QuoteFromOpportunityModalProps) {
  const [formData, setFormData] = useState({
    range_from: '',
    range_to: '',
    notes: '',
  });

  useEffect(() => {
    if (open && opportunity) {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);

      setFormData({
        range_from: today.toISOString().split('T')[0],
        range_to: futureDate.toISOString().split('T')[0],
        notes: opportunity.name || '',
      });
    }
  }, [open, opportunity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.range_from || !formData.range_to) {
      toast.error('Debes especificar el rango de fechas');
      return;
    }

    // TODO: Integración con módulo de cotizaciones (Document service)
    // Este modal está maquetado y listo para cuando se implemente el módulo
    toast.error('El módulo de cotizaciones aún no está implementado');

    // Cuando se implemente:
    // 1. Crear cotización en tabla documents con:
    //    - doc_type: QUOTE
    //    - doc_subtype: CRM
    //    - consecutive: CTC-XXXXXX
    //    - opportunity_id: opportunity.id
    //    - crm_contact_id: opportunity.contact_id
    // 2. Actualizar oportunidad a etapa "Cotizando" si existe
    // 3. Llamar onSuccess()
  };

  if (!opportunity) return null;

  const contactName = opportunity.third_party?.name || 'Sin contacto';
  const contactEmail = opportunity.third_party?.email || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Generar Cotización desde Oportunidad
          </DialogTitle>
          <DialogDescription>
            Crea una cotización CRM vinculada a esta oportunidad
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Módulo no implementado - Warning */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Módulo en desarrollo</p>
                <p>
                  El módulo de cotizaciones (Document service) aún no está implementado.
                  Esta interfaz está lista y se activará cuando el módulo esté disponible.
                </p>
              </div>
            </div>
          </div>

          {/* Información de la oportunidad */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Datos de la Oportunidad
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Cliente</p>
                  <p className="font-medium text-blue-900 dark:text-blue-100">{contactName}</p>
                  {contactEmail && (
                    <p className="text-xs text-blue-700 dark:text-blue-300">{contactEmail}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Valor Esperado</p>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0,
                    }).format(opportunity.expected_value ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="range_from" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha Inicio *
              </Label>
              <DatePicker
                value={formData.range_from}
                onChange={(v) => setFormData({ ...formData, range_from: v })}
              />
            </div>
            <div>
              <Label htmlFor="range_to" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha Fin *
              </Label>
              <DatePicker
                value={formData.range_to}
                onChange={(v) => setFormData({ ...formData, range_to: v })}
              />
            </div>
          </div>

          {/* Notas */}
          <div className="mb-4">
            <Label htmlFor="notes">Notas / Descripción</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Descripción de la cotización..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Podrás agregar ítems y detalles en la vista de edición de cotizaciones
            </p>
          </div>

          {/* Información adicional */}
          <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Flujo previsto:</strong> La cotización se creará como borrador (CTC-XXXXXX).
              Podrás editarla, agregar productos/servicios y enviarla al cliente desde el módulo de Cotizaciones.
              <br />
              <br />
              <strong>Cuando el cliente acepte:</strong> se creará automáticamente como tercero y la oportunidad
              se marcará como ganada.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Crear Cotización
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
