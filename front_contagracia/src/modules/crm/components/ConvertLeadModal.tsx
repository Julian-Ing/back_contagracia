'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { TrendingUp, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CrmLead } from '../types';
import { useStages } from '../hooks/useStages';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { leadsService, opportunitiesService } from '../services/crm.service';

interface ConvertLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CrmLead | null;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  expected_value: string;
  close_date: string;
  stage_id: string;
  probability: string;
}

export default function ConvertLeadModal({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: ConvertLeadModalProps) {
  const companyId = useAuthStore((s) => s.company?.id);
  const { stages, loading: stagesLoading } = useStages();
  const [loading, setLoading] = useState(false);
  const [opportunityCount, setOpportunityCount] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    expected_value: '',
    close_date: '',
    stage_id: '',
    probability: '25',
  });

  // Fetch opportunity count to generate consecutive number
  const fetchOpportunityCount = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await opportunitiesService.getAll(companyId, { take: 1 });
      const total = res.total ?? (Array.isArray(res) ? res.length : 0);
      setOpportunityCount(total);
    } catch {
      setOpportunityCount(0);
    }
  }, [companyId]);

  // Set initial values when lead changes
  useEffect(() => {
    if (lead && open) {
      fetchOpportunityCount();
    }
  }, [lead, open, fetchOpportunityCount]);

  // Generate opportunity name when count or lead changes
  useEffect(() => {
    if (!lead || !open) return;

    const nextNumber = opportunityCount + 1;
    const code = `OPP-${String(nextNumber).padStart(5, '0')}`;
    const contactName = lead.third_party?.name || 'Sin nombre';
    const companyName = lead.third_party?.company_name;

    const name = companyName
      ? `${code} - ${companyName} - ${contactName}`
      : `${code} - ${contactName}`;

    // Find initial stage
    const initialStage = stages.find((s) => s.is_initial_stage && s.is_active);
    const firstStage = stages.find((s) => s.is_active);

    setFormData({
      name,
      expected_value: '',
      close_date: '',
      stage_id: initialStage?.id || firstStage?.id || '',
      probability: String(initialStage?.probability ?? firstStage?.probability ?? 25),
    });
  }, [lead, open, opportunityCount, stages]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStageChange = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    setFormData((prev) => ({
      ...prev,
      stage_id: stageId,
      probability: String(stage?.probability ?? 25),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lead || !companyId) return;

    if (!formData.name.trim()) {
      toast.error('El nombre de la oportunidad es requerido');
      return;
    }

    const expectedValue = Number(formData.expected_value);
    if (!expectedValue || expectedValue <= 0) {
      toast.error('Debe ingresar un valor estimado válido');
      return;
    }

    try {
      setLoading(true);

      await leadsService.convert(companyId, lead.id, {
        name: formData.name,
        expected_value: expectedValue,
        stage_id: formData.stage_id || undefined,
        close_date: formData.close_date || undefined,
        probability: Number(formData.probability),
        assigned_to: lead.assigned_to || undefined,
      });

      toast.success(`Lead "${lead.third_party?.name}" convertido a oportunidad exitosamente`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al convertir el lead';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  const activeStages = stages.filter((s) => s.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle>Convertir a Oportunidad</DialogTitle>
              <DialogDescription>
                Convierte este lead calificado en una oportunidad de venta
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Lead Seleccionado
            </div>
            <div className="text-sm space-y-1 pl-6">
              <div>
                <span className="font-medium">Nombre:</span> {lead.third_party?.name || '—'}
              </div>
              {lead.third_party?.company_name && (
                <div>
                  <span className="font-medium">Empresa:</span> {lead.third_party.company_name}
                </div>
              )}
              {lead.third_party?.email && (
                <div>
                  <span className="font-medium">Email:</span> {lead.third_party.email}
                </div>
              )}
              {lead.third_party?.phone && (
                <div>
                  <span className="font-medium">Teléfono:</span> {lead.third_party.phone}
                </div>
              )}
            </div>
          </div>

          {/* Opportunity Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Oportunidad *</Label>
            <Input
              id="name"
              value={formData.name}
              readOnly
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              El nombre se genera automáticamente con un consecutivo único
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Expected Value */}
            <div className="space-y-2">
              <Label htmlFor="expected_value">Valor Estimado (COP) *</Label>
              <Input
                id="expected_value"
                type="number"
                step="1000"
                min="0"
                value={formData.expected_value}
                onChange={(e) => handleChange('expected_value', e.target.value)}
                placeholder="0"
                required
              />
            </div>

            {/* Close Date */}
            <div className="space-y-2">
              <Label htmlFor="close_date">Fecha Estimada Cierre</Label>
              <DatePicker
                value={formData.close_date}
                onChange={(v) => handleChange('close_date', v)}
                clearable
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Initial Stage */}
            <div className="space-y-2">
              <Label htmlFor="stage_id">Etapa Inicial</Label>
              <Select
                value={formData.stage_id}
                onChange={handleStageChange}
                disabled={stagesLoading || activeStages.length === 0}
                placeholder="Seleccionar etapa..."
                options={[
                  { value: '', label: 'Seleccionar etapa...' },
                  ...activeStages.map((stage) => ({
                    value: stage.id,
                    label: stage.name,
                  })),
                ]}
              />
            </div>

            {/* Probability */}
            <div className="space-y-2">
              <Label htmlFor="probability">Probabilidad (%)</Label>
              <Select
                value={formData.probability}
                onChange={(value) => handleChange('probability', value)}
                options={[
                  { value: '10', label: '10% - Muy baja' },
                  { value: '25', label: '25% - Baja' },
                  { value: '50', label: '50% - Media' },
                  { value: '75', label: '75% - Alta' },
                  { value: '90', label: '90% - Muy alta' },
                ]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Convirtiendo...' : 'Crear Oportunidad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
