'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import type {
  WorkerSubtype,
  WorkerSubtypeRule,
  WorkerSubtypeFormData,
  WorkerSubtypeRuleFormData,
} from '@/modules/admin/types';

type EditingType = 'subtype' | 'rule';

interface WorkerSubtypeFormProps {
  subtype: WorkerSubtype | null;
  rule: WorkerSubtypeRule | null;
  editingType: EditingType;
  isOpen: boolean;
  onClose: () => void;
  onSaveSubtype: (data: Partial<WorkerSubtype>) => void;
  onSaveRule: (data: Partial<WorkerSubtypeRule>) => void;
  loading?: boolean;
}

export function WorkerSubtypeForm({
  subtype,
  rule,
  editingType,
  isOpen,
  onClose,
  onSaveSubtype,
  onSaveRule,
  loading = false,
}: WorkerSubtypeFormProps) {
  const [subtypeFormData, setSubtypeFormData] = useState<WorkerSubtypeFormData>({
    name: '',
    code: '',
    is_active: true,
  });

  const [ruleFormData, setRuleFormData] = useState<WorkerSubtypeRuleFormData>({
    health_employee_pays: true,
    health_employee_rate: '',
    health_employer_rate: '',
    pension_employee_pays: true,
    pension_employee_rate: '',
    pension_employer_rate: '',
    ccf_applies: true,
    icbf_applies: true,
    sena_applies: true,
    arl_applies: true,
    fsp_applies: false,
    fsp_special_rate: '',
    ibc_min_smmlv_percentage: '',
    legal_notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (subtype && editingType === 'subtype') {
      setSubtypeFormData({
        name: subtype.name || '',
        code: subtype.code || '',
        is_active: subtype.is_active,
      });
    }
  }, [subtype, editingType]);

  useEffect(() => {
    if (rule && editingType === 'rule') {
      setRuleFormData({
        health_employee_pays: rule.health_employee_pays,
        health_employee_rate: rule.health_employee_rate?.toString() || '',
        health_employer_rate: rule.health_employer_rate?.toString() || '',
        pension_employee_pays: rule.pension_employee_pays,
        pension_employee_rate: rule.pension_employee_rate?.toString() || '',
        pension_employer_rate: rule.pension_employer_rate?.toString() || '',
        ccf_applies: rule.ccf_applies,
        icbf_applies: rule.icbf_applies,
        sena_applies: rule.sena_applies,
        arl_applies: rule.arl_applies,
        fsp_applies: rule.fsp_applies,
        fsp_special_rate: rule.fsp_special_rate?.toString() || '',
        ibc_min_smmlv_percentage: rule.ibc_min_smmlv_percentage?.toString() || '',
        legal_notes: rule.legal_notes || '',
        is_active: rule.is_active,
      });
    }
  }, [rule, editingType]);

  const handleSubtypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSubtype({
      name: subtypeFormData.name,
      code: subtypeFormData.code,
      is_active: subtypeFormData.is_active,
    });
  };

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRule({
      health_employee_pays: ruleFormData.health_employee_pays,
      health_employee_rate: ruleFormData.health_employee_rate
        ? parseFloat(ruleFormData.health_employee_rate)
        : null,
      health_employer_rate: ruleFormData.health_employer_rate
        ? parseFloat(ruleFormData.health_employer_rate)
        : null,
      pension_employee_pays: ruleFormData.pension_employee_pays,
      pension_employee_rate: ruleFormData.pension_employee_rate
        ? parseFloat(ruleFormData.pension_employee_rate)
        : null,
      pension_employer_rate: ruleFormData.pension_employer_rate
        ? parseFloat(ruleFormData.pension_employer_rate)
        : null,
      ccf_applies: ruleFormData.ccf_applies,
      icbf_applies: ruleFormData.icbf_applies,
      sena_applies: ruleFormData.sena_applies,
      arl_applies: ruleFormData.arl_applies,
      fsp_applies: ruleFormData.fsp_applies,
      fsp_special_rate: ruleFormData.fsp_special_rate
        ? parseFloat(ruleFormData.fsp_special_rate)
        : null,
      ibc_min_smmlv_percentage: ruleFormData.ibc_min_smmlv_percentage
        ? parseFloat(ruleFormData.ibc_min_smmlv_percentage)
        : null,
      legal_notes: ruleFormData.legal_notes,
      is_active: ruleFormData.is_active,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            {editingType === 'subtype' ? 'Editar Subtipo' : 'Editar Regla de Liquidación'}
          </DialogTitle>
          <p className="text-sm text-gray-400">
            {editingType === 'subtype'
              ? 'Modifique la información del subtipo de trabajador'
              : 'Configure las reglas de liquidación para este subtipo'}
          </p>
        </DialogHeader>

        {editingType === 'subtype' ? (
          <form onSubmit={handleSubtypeSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-gray-200">
                  Código *
                </Label>
                <Input
                  id="code"
                  value={subtypeFormData.code}
                  disabled
                  className="bg-slate-800 border-slate-600 text-gray-100 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-200">
                  Nombre *
                </Label>
                <Input
                  id="name"
                  value={subtypeFormData.name}
                  onChange={(e) =>
                    setSubtypeFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="bg-slate-800 border-slate-600 text-gray-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
              <Label htmlFor="is_active" className="text-gray-200 cursor-pointer">
                Activo
              </Label>
              <Switch
                id="is_active"
                checked={subtypeFormData.is_active}
                onCheckedChange={(c) =>
                  setSubtypeFormData((prev) => ({ ...prev, is_active: c }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleRuleSubmit} className="space-y-6 py-4">
            {/* Alert */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                Valores <strong>null</strong> o vacíos en tasas del empleador se interpretan como{' '}
                <strong>0%</strong> (no aplica).
              </p>
            </div>

            {/* Empleado (Deducciones) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100">Empleado (Deducciones)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-200">Empleado paga salud</Label>
                    <Switch
                      checked={ruleFormData.health_employee_pays}
                      onCheckedChange={(c) =>
                        setRuleFormData((prev) => ({ ...prev, health_employee_pays: c }))
                      }
                    />
                  </div>
                  {ruleFormData.health_employee_pays && (
                    <div className="space-y-1">
                      <Label className="text-gray-300 text-sm">Tasa salud empleado (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={ruleFormData.health_employee_rate}
                        onChange={(e) =>
                          setRuleFormData((prev) => ({
                            ...prev,
                            health_employee_rate: e.target.value,
                          }))
                        }
                        placeholder="Vacío = tasa estándar (4%)"
                        className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-200">Empleado paga pensión</Label>
                    <Switch
                      checked={ruleFormData.pension_employee_pays}
                      onCheckedChange={(c) =>
                        setRuleFormData((prev) => ({ ...prev, pension_employee_pays: c }))
                      }
                    />
                  </div>
                  {ruleFormData.pension_employee_pays && (
                    <div className="space-y-1">
                      <Label className="text-gray-300 text-sm">Tasa pensión empleado (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={ruleFormData.pension_employee_rate}
                        onChange={(e) =>
                          setRuleFormData((prev) => ({
                            ...prev,
                            pension_employee_rate: e.target.value,
                          }))
                        }
                        placeholder="Vacío = tasa estándar (4%)"
                        className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Empleador (Aportes) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100">Empleador (Aportes)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-200">Tasa salud empleador (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={ruleFormData.health_employer_rate}
                    onChange={(e) =>
                      setRuleFormData((prev) => ({
                        ...prev,
                        health_employer_rate: e.target.value,
                      }))
                    }
                    placeholder="Vacío = 0% (no aplica)"
                    className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-200">Tasa pensión empleador (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={ruleFormData.pension_employer_rate}
                    onChange={(e) =>
                      setRuleFormData((prev) => ({
                        ...prev,
                        pension_employer_rate: e.target.value,
                      }))
                    }
                    placeholder="Vacío = 0% (no aplica)"
                    className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Parafiscales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100">Parafiscales</h3>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200">CCF</Label>
                  <Switch
                    checked={ruleFormData.ccf_applies}
                    onCheckedChange={(c) =>
                      setRuleFormData((prev) => ({ ...prev, ccf_applies: c }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200">ICBF</Label>
                  <Switch
                    checked={ruleFormData.icbf_applies}
                    onCheckedChange={(c) =>
                      setRuleFormData((prev) => ({ ...prev, icbf_applies: c }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200">SENA</Label>
                  <Switch
                    checked={ruleFormData.sena_applies}
                    onCheckedChange={(c) =>
                      setRuleFormData((prev) => ({ ...prev, sena_applies: c }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-200">ARL</Label>
                  <Switch
                    checked={ruleFormData.arl_applies}
                    onCheckedChange={(c) =>
                      setRuleFormData((prev) => ({ ...prev, arl_applies: c }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* FSP */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100">Fondo de Solidaridad Pensional</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <Label className="text-gray-200">Aplica FSP</Label>
                  <Switch
                    checked={ruleFormData.fsp_applies}
                    onCheckedChange={(c) =>
                      setRuleFormData((prev) => ({ ...prev, fsp_applies: c }))
                    }
                  />
                </div>
                {ruleFormData.fsp_applies && (
                  <div className="space-y-1">
                    <Label className="text-gray-200">Tasa especial FSP (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={ruleFormData.fsp_special_rate}
                      onChange={(e) =>
                        setRuleFormData((prev) => ({
                          ...prev,
                          fsp_special_rate: e.target.value,
                        }))
                      }
                      placeholder="Vacío = tasa estándar"
                      className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                    />
                    <p className="text-xs text-gray-500">Ej: 1% para pensionados &gt;25 SMMLV</p>
                  </div>
                )}
              </div>
            </div>

            {/* IBC */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-100">IBC Mínimo</h3>
              <div className="space-y-1">
                <Label className="text-gray-200">IBC mínimo (% SMMLV)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={ruleFormData.ibc_min_smmlv_percentage}
                  onChange={(e) =>
                    setRuleFormData((prev) => ({
                      ...prev,
                      ibc_min_smmlv_percentage: e.target.value,
                    }))
                  }
                  placeholder="Ej: 40 para taxistas"
                  className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500">
                  Porcentaje del SMMLV que se usará como IBC mínimo proporcional
                </p>
              </div>
            </div>

            {/* Notas legales */}
            <div className="space-y-2">
              <Label className="text-gray-200">Notas Legales</Label>
              <Textarea
                rows={3}
                value={ruleFormData.legal_notes}
                onChange={(e) =>
                  setRuleFormData((prev) => ({ ...prev, legal_notes: e.target.value }))
                }
                placeholder="Ej: Decreto 1047/2014: Conductor independiente, IBC mínimo 40% SMMLV"
                className="bg-slate-800 border-slate-600 text-gray-100 placeholder:text-gray-500"
              />
            </div>

            {/* Regla Activa */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
              <Label className="text-gray-200">Regla Activa</Label>
              <Switch
                checked={ruleFormData.is_active}
                onCheckedChange={(c) =>
                  setRuleFormData((prev) => ({ ...prev, is_active: c }))
                }
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WorkerSubtypeForm;
