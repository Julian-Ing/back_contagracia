'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import type { PayrollConcept, PayrollConceptFormData } from '@/modules/admin/types';

interface PayrollConceptFormProps {
  concept: PayrollConcept | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PayrollConcept>) => void;
  loading?: boolean;
}

const CONCEPT_TYPE_OPTIONS = [
  { value: 'accrued', label: 'Devengado' },
  { value: 'deduction', label: 'Deducción' },
];

export function PayrollConceptForm({
  concept,
  isOpen,
  onClose,
  onSave,
  loading = false,
}: PayrollConceptFormProps) {
  const [formData, setFormData] = useState<PayrollConceptFormData>({
    concept_code: '',
    concept_name: '',
    concept_type: 'accrued',
    is_percentage: false,
    default_value: 0,
    default_percentage: 0,
    is_array: false,
    is_legal: false,
    is_active: true,
    description: '',
    dian_percentage_code: '',
    valid_from: '',
  });

  useEffect(() => {
    if (concept) {
      setFormData({
        concept_code: concept.concept_code || '',
        concept_name: concept.concept_name || '',
        concept_type: concept.concept_type || 'accrued',
        is_percentage: concept.is_percentage,
        default_value: concept.default_value || 0,
        default_percentage: concept.default_percentage || 0,
        is_array: concept.is_array,
        is_legal: concept.is_legal,
        is_active: concept.is_active,
        description: concept.description || '',
        dian_percentage_code: concept.dian_percentage_code?.toString() || '',
        valid_from: concept.valid_from || '',
      });
    }
  }, [concept]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSwitchChange = (id: keyof PayrollConceptFormData, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave: Partial<PayrollConcept> = {
      concept_code: formData.concept_code,
      concept_name: formData.concept_name,
      concept_type: formData.concept_type,
      is_percentage: formData.is_percentage,
      default_value: formData.default_value,
      default_percentage: formData.default_percentage,
      is_array: formData.is_array,
      is_legal: formData.is_legal,
      is_active: formData.is_active,
      description: formData.description,
      dian_percentage_code: formData.dian_percentage_code
        ? parseInt(formData.dian_percentage_code, 10)
        : null,
      valid_from: formData.valid_from || null,
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Editar Concepto</DialogTitle>
          <p className="text-sm text-gray-400">
            Modifique los valores del concepto de nómina
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Code and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="concept_code" className="text-gray-200">
                Código *
              </Label>
              <Input
                id="concept_code"
                value={formData.concept_code}
                onChange={handleChange}
                required
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Tipo *</Label>
              <Select
                options={CONCEPT_TYPE_OPTIONS}
                value={formData.concept_type}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    concept_type: value as 'accrued' | 'deduction',
                  }))
                }
                className="bg-slate-800"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="concept_name" className="text-gray-200">
              Nombre *
            </Label>
            <Input
              id="concept_name"
              value={formData.concept_name}
              onChange={handleChange}
              required
              className="bg-slate-800 border-slate-600 text-gray-100"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="bg-slate-800 border-slate-600 text-gray-100"
            />
          </div>

          {/* Default Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_value" className="text-gray-200">
                Valor por Defecto
              </Label>
              <Input
                id="default_value"
                type="number"
                step="0.01"
                value={formData.default_value}
                onChange={handleChange}
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_percentage" className="text-gray-200">
                Porcentaje por Defecto (%)
              </Label>
              <Input
                id="default_percentage"
                type="number"
                step="0.01"
                value={formData.default_percentage}
                onChange={handleChange}
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
          </div>

          {/* DIAN Code and Valid From */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dian_percentage_code" className="text-gray-200">
                Código DIAN
              </Label>
              <Input
                id="dian_percentage_code"
                type="number"
                value={formData.dian_percentage_code}
                onChange={handleChange}
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_from" className="text-gray-200">
                Válido Desde
              </Label>
              <DatePicker
                value={formData.valid_from}
                onChange={(v) => setFormData((prev) => ({ ...prev, valid_from: v }))}
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_percentage" className="text-gray-200 cursor-pointer">
                Es Porcentaje
              </Label>
              <Switch
                id="is_percentage"
                checked={formData.is_percentage}
                onCheckedChange={(c) => handleSwitchChange('is_percentage', c)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_array" className="text-gray-200 cursor-pointer">
                Es Array
              </Label>
              <Switch
                id="is_array"
                checked={formData.is_array}
                onCheckedChange={(c) => handleSwitchChange('is_array', c)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_legal" className="text-gray-200 cursor-pointer">
                Es Legal
              </Label>
              <Switch
                id="is_legal"
                checked={formData.is_legal}
                onCheckedChange={(c) => handleSwitchChange('is_legal', c)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active" className="text-gray-200 cursor-pointer">
                Activo
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(c) => handleSwitchChange('is_active', c)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.concept_code.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PayrollConceptForm;
