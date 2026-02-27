'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Loader2 } from 'lucide-react';
import { companyPaymentMethodsService } from '../services/companyPaymentMethods.service';
import type { CompanyPaymentMethod, DianPaymentMethod } from '../types';

interface PaymentMethodFormProps {
  mode: 'create' | 'edit';
  editing?: CompanyPaymentMethod | null;
  onSuccess?: (result: CompanyPaymentMethod) => void;
  onCancel?: () => void;
}

export function PaymentMethodForm({ mode, editing, onSuccess, onCancel }: PaymentMethodFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [dianMethods, setDianMethods] = useState<DianPaymentMethod[]>([]);
  const [loadingDian, setLoadingDian] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && editing) {
      setName(editing.name);
      setDescription(editing.description || '');
      setPaymentMethodId(editing.payment_method_id);
      setIsActive(editing.is_active);
    } else {
      setName('');
      setDescription('');
      setPaymentMethodId('');
      setIsActive(true);
    }
  }, [mode, editing]);

  useEffect(() => {
    if (mode === 'create') {
      setLoadingDian(true);
      companyPaymentMethodsService.getDianPaymentMethods()
        .then(setDianMethods)
        .catch(() => toast.error('Error al cargar métodos DIAN'))
        .finally(() => setLoadingDian(false));
    }
  }, [mode]);

  const dianOptions = dianMethods.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setSubmitting(true);
    try {
      let result: CompanyPaymentMethod;
      if (mode === 'edit' && editing) {
        result = await companyPaymentMethodsService.update(editing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
        });
        toast.success('Método de pago actualizado');
      } else {
        if (!paymentMethodId) {
          toast.error('Selecciona un tipo de método de pago');
          setSubmitting(false);
          return;
        }
        result = await companyPaymentMethodsService.create({
          payment_method_id: paymentMethodId,
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Método de pago creado');
      }
      onSuccess?.(result);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {mode === 'create' && (
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <SearchableSelect
            options={dianOptions}
            value={paymentMethodId}
            onChange={(v) => setPaymentMethodId(v)}
            placeholder={loadingDian ? 'Cargando...' : 'Seleccionar tipo de método'}
            clearable={false}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Nequi, Daviplata, Efectivo..."
        />
      </div>
      <div className="space-y-2">
        <Label>Descripción</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción opcional"
        />
      </div>
      {mode === 'edit' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pm_is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="pm_is_active">Activo</Label>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'edit' ? 'Guardar' : 'Crear'}
        </Button>
      </div>
    </div>
  );
}
