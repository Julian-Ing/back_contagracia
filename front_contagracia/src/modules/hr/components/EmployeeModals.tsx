'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { employeesService } from '../services/employees.service';
import { companySettingsService } from '../services/company-settings.service';
import { useSocialSecurityEntities } from '../hooks/useSocialSecurityEntities';
import type { CreateContractDto, UpdateSalaryDto, RenewContractDto, TerminateEmployeeDto, EmployeeContract, SalaryRecord, SalaryType, TerminationType } from '../types';
import { SALARY_TYPE_LABELS, TERMINATION_TYPE_LABELS } from '../types';
import toast from 'react-hot-toast';

// ==================== New Contract Modal ====================

export function NewContractModal({
  open,
  onClose,
  employeeId,
  currentSalary,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  currentSalary?: SalaryRecord | null;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { contractTypes, workerTypes, workerSubtypes, loadWorkerSubtypes } = useSocialSecurityEntities();
  const noCurrentSalary = !currentSalary;
  const [changeSalary, setChangeSalary] = useState(noCurrentSalary);
  const [legalTransport, setLegalTransport] = useState<number>(0);
  const [form, setForm] = useState({
    contract_type_id: '',
    worker_type_id: '',
    worker_subtype_id: '',
    position: '',
    probation_days: '',
    includes_transport: true,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    observations: '',
    // Salary fields
    salary: '',
    salary_type: 'ORDINARIO' as SalaryType,
    variable_salary: false,
  });

  // Load legal transportation allowance from company settings
  useEffect(() => {
    companySettingsService.getByCategory('legal_params')
      .then((params) => {
        const val = params?.transportation_allowance?.value;
        if (val) setLegalTransport(Number(val));
      })
      .catch(() => {});
  }, []);

  // Pre-fill salary from current when toggling on
  useEffect(() => {
    if (changeSalary && currentSalary && !form.salary) {
      setForm((p) => ({
        ...p,
        salary: currentSalary.salary?.toString() || '',
        salary_type: currentSalary.salary_type || 'ORDINARIO',
        variable_salary: currentSalary.variable_salary ?? false,
      }));
    }
  }, [changeSalary, currentSalary]);

  useEffect(() => {
    if (form.worker_type_id) {
      loadWorkerSubtypes(form.worker_type_id);
    }
  }, [form.worker_type_id, loadWorkerSubtypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_date) {
      toast.error('La fecha de inicio es requerida');
      return;
    }
    if (changeSalary && !form.salary) {
      toast.error('El salario es requerido si cambia el salario');
      return;
    }
    setLoading(true);
    try {
      const dto: CreateContractDto = {
        contract_type_id: form.contract_type_id || undefined,
        worker_type_id: form.worker_type_id || undefined,
        worker_subtype_id: form.worker_subtype_id || undefined,
        position: form.position || undefined,
        probation_days: form.probation_days ? parseInt(form.probation_days) : undefined,
        includes_transport: form.includes_transport,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        observations: form.observations || undefined,
        ...(changeSalary && {
          salary: parseFloat(form.salary),
          salary_type: form.salary_type,
          transportation_allowance: form.includes_transport ? legalTransport : 0,
          variable_salary: form.variable_salary,
        }),
      };
      await employeesService.createContract(employeeId, dto);
      toast.success('Contrato creado exitosamente');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear contrato');
    } finally {
      setLoading(false);
    }
  };

  const toOptions = (items: Array<{ id: string; name: string; code?: string }>) =>
    items.map((i) => ({ value: i.id, label: i.code ? `${i.code} - ${i.name}` : i.name }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Contrato</Label>
              <Select
                options={toOptions(contractTypes)}
                value={form.contract_type_id}
                onChange={(v) => setForm((p) => ({ ...p, contract_type_id: v }))}
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <Label>Tipo de Trabajador</Label>
              <Select
                options={toOptions(workerTypes)}
                value={form.worker_type_id}
                onChange={(v) => setForm((p) => ({ ...p, worker_type_id: v, worker_subtype_id: '' }))}
                placeholder="Seleccionar..."
              />
            </div>
            {workerSubtypes.length > 0 && (
              <div className="col-span-2">
                <Label>Subtipo de Trabajador</Label>
                <Select
                  options={toOptions(workerSubtypes)}
                  value={form.worker_subtype_id}
                  onChange={(v) => setForm((p) => ({ ...p, worker_subtype_id: v }))}
                  placeholder="Seleccionar..."
                />
              </div>
            )}
            <div className="col-span-2">
              <Label>Cargo / Posicion</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                placeholder="Ej: Auxiliar contable"
              />
            </div>
            <div>
              <Label>Dias de Prueba</Label>
              <Input
                type="number"
                value={form.probation_days}
                onChange={(e) => setForm((p) => ({ ...p, probation_days: e.target.value }))}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="contract_transport"
                checked={form.includes_transport}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, includes_transport: !!checked }))}
              />
              <Label htmlFor="contract_transport" className="font-normal">Incluye Aux. Transporte</Label>
            </div>
            <div>
              <Label>Fecha Inicio *</Label>
              <DatePicker
                value={form.start_date}
                onChange={(v) => setForm((p) => ({ ...p, start_date: v }))}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <DatePicker
                value={form.end_date}
                onChange={(v) => setForm((p) => ({ ...p, end_date: v }))}
                clearable
              />
            </div>
            <div className="col-span-2">
              <Label>Observaciones</Label>
              <Input
                value={form.observations}
                onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
                placeholder="Notas opcionales..."
              />
            </div>
          </div>

          {/* Salary section */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox
                id="change_salary"
                checked={changeSalary}
                onCheckedChange={(checked) => setChangeSalary(!!checked)}
                disabled={noCurrentSalary}
              />
              <Label htmlFor="change_salary" className={`font-normal ${noCurrentSalary ? 'text-muted-foreground' : ''}`}>
                {noCurrentSalary ? 'Debe ingresar salario (no tiene salario vigente)' : 'Cambiar salario con este contrato'}
              </Label>
            </div>
            {!changeSalary && currentSalary && (
              <p className="text-xs text-muted-foreground">
                Se mantendra el salario actual: <FormattedNumber value={currentSalary.salary} type="currency" /> ({SALARY_TYPE_LABELS[currentSalary.salary_type] || 'Ordinario'})
              </p>
            )}
            {noCurrentSalary && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                El empleado no tiene salario vigente. Es obligatorio asignar un salario con el nuevo contrato.
              </p>
            )}
            {changeSalary && (
              <div className="space-y-3">
                <div>
                  <Label>Nuevo Salario Mensual *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <NumericInput
                      value={form.salary}
                      onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
                      placeholder="0"
                      allowNegative={false}
                      maxDecimals={0}
                      className="pl-7 text-left"
                    />
                  </div>
                </div>
                {form.includes_transport && legalTransport > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aux. Transporte: <span className="font-medium text-foreground"><FormattedNumber value={legalTransport} type="currency" /></span> (valor legal configurado)
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Contrato
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Change Salary Modal ====================

export function ChangeSalaryModal({
  open,
  onClose,
  employeeId,
  currentSalary,
  contractIncludesTransport,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  currentSalary?: SalaryRecord | null;
  contractIncludesTransport?: boolean;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [legalTransport, setLegalTransport] = useState<number>(0);
  const [form, setForm] = useState({
    salary: '',
    salary_type: 'ORDINARIO' as SalaryType,
    variable_salary: false,
    effective_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  // Load legal transportation allowance
  useEffect(() => {
    companySettingsService.getByCategory('legal_params')
      .then((params) => {
        const val = params?.transportation_allowance?.value;
        if (val) setLegalTransport(Number(val));
      })
      .catch(() => {});
  }, []);

  // Pre-fill with current salary values
  useEffect(() => {
    if (currentSalary) {
      setForm({
        salary: currentSalary.salary?.toString() || '',
        salary_type: currentSalary.salary_type || 'ORDINARIO',
        variable_salary: currentSalary.variable_salary ?? false,
        effective_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
    }
  }, [currentSalary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.salary) {
      toast.error('El salario es requerido');
      return;
    }
    setLoading(true);
    try {
      const dto: UpdateSalaryDto = {
        salary: parseFloat(form.salary),
        salary_type: form.salary_type,
        transportation_allowance: contractIncludesTransport ? legalTransport : undefined,
        variable_salary: form.variable_salary,
        effective_date: form.effective_date || undefined,
        reason: form.reason || undefined,
      };
      await employeesService.updateSalary(employeeId, dto);
      toast.success('Salario actualizado exitosamente');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar salario');
    } finally {
      setLoading(false);
    }
  };

  const REASON_OPTIONS = [
    { value: '', label: 'Seleccionar motivo...' },
    { value: 'Ingreso', label: 'Ingreso' },
    { value: 'Aumento anual', label: 'Aumento anual' },
    { value: 'Promoción', label: 'Promoción' },
    { value: 'Ajuste', label: 'Ajuste' },
    { value: 'Otro', label: 'Otro' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambiar Salario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {currentSalary && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-sm space-y-1">
              <div>
                <span className="text-gray-500 dark:text-slate-400">Salario actual: </span>
                <span className="font-semibold"><FormattedNumber value={currentSalary.salary} type="currency" /></span>
                <span className="text-gray-400 ml-1">({SALARY_TYPE_LABELS[currentSalary.salary_type] || 'Ordinario'})</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Contrato {contractIncludesTransport ? 'incluye' : 'NO incluye'} auxilio de transporte
                {contractIncludesTransport && currentSalary.transportation_allowance
                  ? <> (<FormattedNumber value={currentSalary.transportation_allowance} type="currency" />)</>

                  : ''}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nuevo Salario *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <NumericInput
                  value={form.salary}
                  onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
                  placeholder="0"
                  allowNegative={false}
                  maxDecimals={0}
                  className="pl-7 text-left"
                />
              </div>
            </div>
            <div>
              <Label>Tipo de Salario</Label>
              <Select
                options={Object.entries(SALARY_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                value={form.salary_type}
                onChange={(v) => setForm((p) => ({ ...p, salary_type: v as SalaryType }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.salary_type === 'INTEGRAL' ? 'Prestaciones incluidas (factor 30%)' : 'Prestaciones por separado (prima, cesantias, etc.)'}
              </p>
            </div>
            <div className="col-span-2">
              {contractIncludesTransport !== false ? (
                legalTransport > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aux. Transporte: <span className="font-medium text-foreground"><FormattedNumber value={legalTransport} type="currency" /></span> (valor legal configurado)
                  </p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">El contrato actual no incluye aux. de transporte. Para habilitarlo, edite el contrato.</p>
              )}
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="modal_variable"
                checked={form.variable_salary}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, variable_salary: !!checked }))}
              />
              <Label htmlFor="modal_variable" className="font-normal">Salario Variable (comisiones)</Label>
            </div>
            <div>
              <Label>Fecha Efectiva *</Label>
              <DatePicker
                value={form.effective_date}
                onChange={(v) => setForm((p) => ({ ...p, effective_date: v }))}
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Select
                options={REASON_OPTIONS}
                value={form.reason}
                onChange={(v) => setForm((p) => ({ ...p, reason: v }))}
                placeholder="Seleccionar..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Actualizar Salario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit Contract Modal ====================

export function EditContractModal({
  open,
  onClose,
  employeeId,
  contract,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  contract: EmployeeContract;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    position: '',
    includes_transport: true,
    end_date: '',
    observations: '',
  });

  useEffect(() => {
    if (contract) {
      setForm({
        position: contract.position || '',
        includes_transport: contract.includes_transport ?? true,
        end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
        observations: contract.observations || '',
      });
    }
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await employeesService.updateContract(employeeId, contract.id, {
        position: form.position || undefined,
        includes_transport: form.includes_transport,
        start_date: contract.start_date,
        end_date: form.end_date || undefined,
        observations: form.observations || undefined,
      });
      toast.success('Contrato actualizado');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-sm">
            <span className="text-gray-500 dark:text-slate-400">Contrato: </span>
            <span className="font-semibold">{contract.contract_type?.name || '-'}</span>
            <span className="text-gray-400 ml-2">({contract.contract_number || 'Sin No.'})</span>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Cargo / Posicion</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                placeholder="Ej: Auxiliar contable"
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <DatePicker
                value={form.end_date}
                onChange={(v) => setForm((p) => ({ ...p, end_date: v }))}
                clearable
              />
              <p className="text-xs text-muted-foreground mt-1">Dejar vacio para contrato indefinido</p>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_transport"
                  checked={form.includes_transport}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, includes_transport: !!checked }))}
                />
                <Label htmlFor="edit_transport" className="font-normal">Incluye Aux. Transporte</Label>
              </div>
              {!form.includes_transport && contract.includes_transport && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Al desactivar, el monto del aux. transporte en el salario quedara en $0 en la proxima nomina.
                </p>
              )}
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input
                value={form.observations}
                onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
                placeholder="Notas..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Renew Contract Modal ====================

export function RenewContractModal({
  open,
  onClose,
  employeeId,
  contract,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  contract: EmployeeContract;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    observations: '',
  });

  useEffect(() => {
    const ed = contract.end_date ? contract.end_date.split('T')[0] : new Date().toISOString().split('T')[0];
    setForm({ start_date: ed, end_date: '', observations: '' });
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_date) {
      toast.error('La fecha de inicio es requerida');
      return;
    }
    setLoading(true);
    try {
      const dto: RenewContractDto = {
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        observations: form.observations || undefined,
      };
      await employeesService.renewContract(employeeId, contract.id, dto);
      toast.success('Contrato renovado exitosamente');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al renovar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renovar Contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500 dark:text-slate-400">Contrato actual: </span><span className="font-semibold">{contract.contract_type?.name || '-'}</span></p>
            <p><span className="text-gray-500 dark:text-slate-400">Cargo: </span>{contract.position || '-'}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Se creara un nuevo contrato con los mismos datos base y nuevas fechas. El contrato actual se cerrara.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nueva Fecha Inicio *</Label>
              <DatePicker
                value={form.start_date}
                onChange={(v) => setForm((p) => ({ ...p, start_date: v }))}
              />
            </div>
            <div>
              <Label>Nueva Fecha Fin</Label>
              <DatePicker
                value={form.end_date}
                onChange={(v) => setForm((p) => ({ ...p, end_date: v }))}
                clearable
              />
            </div>
            <div className="col-span-2">
              <Label>Observaciones</Label>
              <Input
                value={form.observations}
                onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
                placeholder="Motivo de la renovacion..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Renovar Contrato
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Terminate Employee Modal ====================

export function TerminateModal({
  open,
  onClose,
  employeeId,
  employeeName,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    termination_type: '' as TerminationType | '',
    termination_date: new Date().toISOString().split('T')[0],
    termination_reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.termination_type) {
      toast.error('Seleccione el tipo de terminacion');
      return;
    }
    setLoading(true);
    try {
      const dto: TerminateEmployeeDto = {
        termination_type: form.termination_type as TerminationType,
        termination_date: form.termination_date || undefined,
        termination_reason: form.termination_reason || undefined,
      };
      await employeesService.terminate(employeeId, dto);
      toast.success('Contrato terminado exitosamente');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al terminar contrato');
    } finally {
      setLoading(false);
    }
  };

  const terminationOptions = Object.entries(TERMINATION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Terminar Contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-sm">
            <p className="text-red-700 dark:text-red-300 font-medium">Se terminara el contrato de: {employeeName}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">El estado del empleado cambiara a TERMINADO y se cerrara el contrato vigente.</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Terminacion *</Label>
              <Select
                options={terminationOptions}
                value={form.termination_type}
                onChange={(v) => setForm((p) => ({ ...p, termination_type: v as TerminationType }))}
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <Label>Fecha de Terminacion</Label>
              <DatePicker
                value={form.termination_date}
                onChange={(v) => setForm((p) => ({ ...p, termination_date: v }))}
              />
            </div>
            <div>
              <Label>Motivo / Observaciones</Label>
              <Input
                value={form.termination_reason}
                onChange={(e) => setForm((p) => ({ ...p, termination_reason: e.target.value }))}
                placeholder="Detalle del motivo..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} variant="destructive">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Terminar Contrato
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
