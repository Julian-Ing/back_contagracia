'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolutionsService, type Resolution, type CreateResolutionDto } from '../services/resolutions.service';
import { AsyncSearchableSelect } from '@/shared/components/ui/async-searchable-select';
import type { LoadOptionsResult, AsyncSelectOption } from '@/shared/components/ui/async-searchable-select';
import { electronicDocsClient } from '@/shared/services/api/apiClient';

interface ResolutionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolution?: Resolution | null;
  onSuccess: () => void;
}

const INITIAL_FORM: CreateResolutionDto = {
  type_document_id: '',
  prefix: '',
  resolution_number: '',
  resolution_date: new Date().toISOString().split('T')[0],
  technical_key: '',
  range_from: 1,
  range_to: 1000000,
  last_external_consecutive: 0,
  date_from: new Date().toISOString().split('T')[0],
  date_to: new Date().toISOString().split('T')[0],
  is_active: true,
};

export const ResolutionFormDialog = ({ open, onOpenChange, resolution, onSuccess }: ResolutionFormDialogProps) => {
  const [formData, setFormData] = useState<CreateResolutionDto>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedTypeDoc, setSelectedTypeDoc] = useState<AsyncSelectOption | null>(null);

  const isEditing = !!resolution;

  useEffect(() => {
    if (open && resolution) {
      setFormData({
        type_document_id: resolution.type_document_id,
        prefix: resolution.prefix,
        resolution_number: resolution.resolution_number,
        resolution_date: resolution.resolution_date.split('T')[0],
        technical_key: resolution.technical_key || '',
        range_from: resolution.range_from,
        range_to: resolution.range_to,
        last_external_consecutive: resolution.last_external_consecutive,
        date_from: resolution.date_from.split('T')[0],
        date_to: resolution.date_to.split('T')[0],
        is_active: resolution.is_active,
      });
      const typeDocOption = {
        value: resolution.type_document.id,
        label: resolution.type_document.name,
        description: `Código: ${resolution.type_document.code}`,
      };
      console.log('🔄 Setting selectedTypeDoc:', typeDocOption);
      setSelectedTypeDoc(typeDocOption);
    } else if (open) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({ ...INITIAL_FORM, resolution_date: today, date_from: today, date_to: today });
      setSelectedTypeDoc(null);
    }
  }, [open, resolution]);

  const loadTypeDocuments = async (search: string, page: number): Promise<LoadOptionsResult> => {
    const response = await electronicDocsClient.get('/type-documents', {
      params: { search, page, limit: 20 },
    });
    const options: AsyncSelectOption[] = response.data.data.map((doc: any) => ({
      value: doc.id,
      label: doc.name,
      description: `Código: ${doc.code}`,
    }));
    return {
      data: options,
      hasMore: response.data.page < response.data.totalPages,
      total: response.data.total,
    };
  };

  const handleChange = (field: keyof CreateResolutionDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.type_document_id) {
      toast.error('Selecciona un tipo de documento');
      return false;
    }
    if (!formData.prefix) {
      toast.error('Ingresa el prefijo');
      return false;
    }
    if (!formData.resolution_number) {
      toast.error('Ingresa el número de resolución');
      return false;
    }
    if (!formData.resolution_date) {
      toast.error('Selecciona la fecha de resolución');
      return false;
    }
    if (!formData.date_from) {
      toast.error('Selecciona la fecha válida desde');
      return false;
    }
    if (!formData.date_to) {
      toast.error('Selecciona la fecha válida hasta');
      return false;
    }

    if (formData.prefix.length > 10) {
      toast.error('El prefijo no debe superar los 10 caracteres');
      return false;
    }

    // Technical key obligatorio para tipos 1, 2, 3, 12
    const requiresTechnicalKey = ['1', '2', '3', '12'].includes(formData.type_document_id);
    if (requiresTechnicalKey && !formData.technical_key) {
      toast.error('La clave técnica es obligatoria para este tipo de documento');
      return false;
    }

    if (formData.range_from <= 0 || formData.range_to <= 0) {
      toast.error('Los consecutivos deben ser mayores a 0');
      return false;
    }

    if (formData.range_to <= formData.range_from) {
      toast.error('El consecutivo "Hasta" debe ser mayor que "Desde"');
      return false;
    }

    if (formData.last_external_consecutive !== undefined && formData.last_external_consecutive < 0) {
      toast.error('El último consecutivo externo no puede ser negativo');
      return false;
    }

    if (formData.last_external_consecutive !== undefined && formData.last_external_consecutive > formData.range_to) {
      toast.error('El último consecutivo externo no puede ser mayor que el consecutivo "Hasta"');
      return false;
    }

    if (new Date(formData.date_from) > new Date(formData.date_to)) {
      toast.error('La fecha "Válida Desde" no puede ser mayor que "Válida Hasta"');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (isEditing) {
        await resolutionsService.update(resolution!.id, formData);
        toast.success('Resolución actualizada exitosamente');
      } else {
        await resolutionsService.create(formData);
        toast.success('Resolución creada exitosamente');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar la resolución');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Resolución' : 'Nueva Resolución'}</DialogTitle>
          <DialogDescription>
            Completa los datos según la resolución de la DIAN.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Tipo de Documento */}
          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <AsyncSearchableSelect
              loadOptions={loadTypeDocuments}
              value={formData.type_document_id}
              valueLabel={selectedTypeDoc?.label}
              onChange={(value, option) => {
                setSelectedTypeDoc(option || null);
                handleChange('type_document_id', value);
              }}
              placeholder="Selecciona un tipo de documento"
              className="w-full"
            />
          </div>

          {/* Prefijo y Número Resolución */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefijo *</Label>
              <Input
                id="prefix"
                placeholder="Ej: FE"
                value={formData.prefix}
                onChange={(e) => handleChange('prefix', e.target.value)}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution_number">Número Resolución *</Label>
              <Input
                id="resolution_number"
                placeholder="Ej: 18760000001"
                value={formData.resolution_number}
                onChange={(e) => handleChange('resolution_number', e.target.value)}
              />
            </div>
          </div>

          {/* Fecha Resolución */}
          <div className="space-y-2">
            <Label htmlFor="resolution_date">Fecha Resolución *</Label>
            <DatePicker
              value={formData.resolution_date}
              onChange={(value) => handleChange('resolution_date', value)}
              placeholder="Seleccionar fecha"
            />
          </div>

          {/* Clave Técnica */}
          <div className="space-y-2">
            <Label htmlFor="technical_key">Clave Técnica</Label>
            <Input
              id="technical_key"
              placeholder="Ingresa la clave técnica de la DIAN (opcional)"
              value={formData.technical_key}
              onChange={(e) => handleChange('technical_key', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Obligatoria para facturas, notas crédito y débito.
            </p>
          </div>

          {/* Consecutivos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="range_from">Consecutivo Desde *</Label>
              <Input
                id="range_from"
                type="number"
                placeholder="Ej: 1"
                value={formData.range_from}
                onChange={(e) => handleChange('range_from', parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="range_to">Consecutivo Hasta *</Label>
              <Input
                id="range_to"
                type="number"
                placeholder="Ej: 1000000"
                value={formData.range_to}
                onChange={(e) => handleChange('range_to', parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
          </div>

          {/* Último Consecutivo Externo */}
          <div className="space-y-2">
            <Label htmlFor="last_external_consecutive">Último Consecutivo Externo</Label>
            <Input
              id="last_external_consecutive"
              type="number"
              placeholder="Ej: 0"
              value={formData.last_external_consecutive}
              onChange={(e) => handleChange('last_external_consecutive', parseInt(e.target.value) || 0)}
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Número desde el cual continuará la numeración.
            </p>
          </div>

          {/* Fechas de Validez */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_from">Válida Desde *</Label>
              <DatePicker
                value={formData.date_from}
                onChange={(value) => handleChange('date_from', value)}
                placeholder="Seleccionar fecha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_to">Válida Hasta *</Label>
              <DatePicker
                value={formData.date_to}
                onChange={(value) => handleChange('date_to', value)}
                placeholder="Seleccionar fecha"
              />
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-3">
            <Label htmlFor="is_active">Resolución Activa</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
