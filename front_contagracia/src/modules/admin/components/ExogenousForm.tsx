'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import type {
  ExogenousFormat,
  ExogenousConcept,
  ExogenousFormatFormData,
  ExogenousConceptFormData,
} from '@/modules/admin/types';

type EditingType = 'format' | 'concept';

interface ExogenousFormProps {
  format: ExogenousFormat | null;
  concept: ExogenousConcept | null;
  editingType: EditingType;
  isOpen: boolean;
  onClose: () => void;
  onSaveFormat: (data: Partial<ExogenousFormat>) => void;
  onSaveConcept: (data: Partial<ExogenousConcept>) => void;
  loading?: boolean;
}

export function ExogenousForm({
  format,
  concept,
  editingType,
  isOpen,
  onClose,
  onSaveFormat,
  onSaveConcept,
  loading = false,
}: ExogenousFormProps) {
  const [formatFormData, setFormatFormData] = useState<ExogenousFormatFormData>({
    code: '',
    year: new Date().getFullYear(),
    name: '',
  });

  const [conceptFormData, setConceptFormData] = useState<ExogenousConceptFormData>({
    code: '',
    name: '',
    account_code: '',
    account_name: '',
  });

  useEffect(() => {
    if (format && editingType === 'format') {
      setFormatFormData({
        code: format.code || '',
        year: format.year || new Date().getFullYear(),
        name: format.name || '',
      });
    } else if (!format && editingType === 'format') {
      setFormatFormData({
        code: '',
        year: new Date().getFullYear(),
        name: '',
      });
    }
  }, [format, editingType]);

  useEffect(() => {
    if (concept && editingType === 'concept') {
      setConceptFormData({
        code: concept.code || '',
        name: concept.name || '',
        account_code: concept.account_code || '',
        account_name: concept.account_name || '',
      });
    } else if (!concept && editingType === 'concept') {
      setConceptFormData({
        code: '',
        name: '',
        account_code: '',
        account_name: '',
      });
    }
  }, [concept, editingType]);

  const handleFormatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveFormat({
      code: formatFormData.code,
      year: formatFormData.year,
      name: formatFormData.name,
    });
  };

  const handleConceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConcept({
      code: conceptFormData.code,
      name: conceptFormData.name,
      account_code: conceptFormData.account_code || null,
      account_name: conceptFormData.account_name || null,
    });
  };

  const isEditing = editingType === 'format' ? !!format : !!concept;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {editingType === 'format'
              ? isEditing
                ? 'Editar Formato'
                : 'Crear Formato'
              : isEditing
                ? 'Editar Concepto'
                : 'Crear Concepto'}
          </DialogTitle>
          <p className="text-sm text-gray-400">
            {editingType === 'format'
              ? isEditing
                ? 'Modifique los datos del formato exógeno'
                : 'Cree un nuevo formato exógeno'
              : isEditing
                ? 'Modifique los datos del concepto'
                : 'Cree un nuevo concepto para este formato'}
          </p>
        </DialogHeader>

        {editingType === 'format' ? (
          <form onSubmit={handleFormatSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="format_code" className="text-gray-200">
                Código *
              </Label>
              <Input
                id="format_code"
                value={formatFormData.code}
                onChange={(e) =>
                  setFormatFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="Ej: 1001"
                required
                className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format_year" className="text-gray-200">
                Año *
              </Label>
              <Input
                id="format_year"
                type="number"
                value={formatFormData.year}
                onChange={(e) =>
                  setFormatFormData((prev) => ({
                    ...prev,
                    year: parseInt(e.target.value) || new Date().getFullYear(),
                  }))
                }
                required
                className="bg-slate-800 border-slate-600 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format_name" className="text-gray-200">
                Nombre *
              </Label>
              <Input
                id="format_name"
                value={formatFormData.name}
                onChange={(e) =>
                  setFormatFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej: Pagos o abonos en cuenta..."
                required
                className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formatFormData.code.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleConceptSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concept_code" className="text-gray-200">
                  Código *
                </Label>
                <Input
                  id="concept_code"
                  value={conceptFormData.code}
                  onChange={(e) =>
                    setConceptFormData((prev) => ({ ...prev, code: e.target.value }))
                  }
                  placeholder="Ej: 5002"
                  required
                  className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="concept_name" className="text-gray-200">
                  Nombre *
                </Label>
                <Input
                  id="concept_name"
                  value={conceptFormData.name}
                  onChange={(e) =>
                    setConceptFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Honorarios"
                  required
                  className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_code" className="text-gray-200">
                  Código PUC (6 dígitos)
                </Label>
                <Input
                  id="account_code"
                  value={conceptFormData.account_code}
                  onChange={(e) =>
                    setConceptFormData((prev) => ({ ...prev, account_code: e.target.value }))
                  }
                  placeholder="Ej: 511005"
                  maxLength={6}
                  className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name" className="text-gray-200">
                  Nombre Cuenta PUC
                </Label>
                <Input
                  id="account_name"
                  value={conceptFormData.account_name}
                  onChange={(e) =>
                    setConceptFormData((prev) => ({ ...prev, account_name: e.target.value }))
                  }
                  placeholder="Ej: Honorarios"
                  className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !conceptFormData.code.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ExogenousForm;
