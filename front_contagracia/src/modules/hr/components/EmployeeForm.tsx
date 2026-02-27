'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { User, Briefcase, Shield, CreditCard, Loader2, UserPlus } from 'lucide-react';
import { ThirdPartyForm } from '@/modules/third-parties';
import type { ThirdPartyFormRef } from '@/modules/third-parties';
import type { ThirdParty } from '@/modules/third-parties';
import { employeesService } from '../services/employees.service';
import { useSocialSecurityEntities } from '../hooks/useSocialSecurityEntities';
import type { Employee, CreateEmployeeDto, UpdateEmployeeDto, BankAccountType, SystemRole, UnlinkedUser } from '../types';
import toast from 'react-hot-toast';

interface EmployeeFormProps {
  mode: 'create' | 'edit';
  initialData?: Employee;
  onSuccess: () => void;
  onCancel: () => void;
}

const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: 'SAVINGS', label: 'Ahorros' },
  { value: 'CHECKING', label: 'Corriente' },
];

export function EmployeeForm({ mode, initialData, onSuccess, onCancel }: EmployeeFormProps) {
  const thirdPartyRef = useRef<ThirdPartyFormRef>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Solo datos de empleado (ThirdParty lo maneja ThirdPartyForm via ref)
  const [formData, setFormData] = useState({
    // Laboral
    hire_date: '',
    contract_end_date: '',
    contract_type_id: '',
    worker_type_id: '',
    worker_subtype_id: '',
    position: '',
    probation_days: '',
    includes_transport: true,
    is_administrative: false,
    director_id: '',
    cost_center_id: '',
    // Salario
    salary: '',
    salary_type: 'ORDINARIO',
    transportation_allowance: '',
    variable_salary: false,
    // Bancario
    bank_name: '',
    bank_account_type: '' as BankAccountType | '',
    bank_account_number: '',
    // Seguridad social
    eps_id: '',
    pension_fund_id: '',
    arl_id: '',
    arl_risk_id: '',
    compensation_fund_id: '',
    severance_fund_id: '',
  });

  // Estado para vinculación de usuario
  const [userLinkMode, setUserLinkMode] = useState<'none' | 'create' | 'existing'>('none');
  const [systemEmail, setSystemEmail] = useState('');
  const [systemPassword, setSystemPassword] = useState('');
  const [systemRoleId, setSystemRoleId] = useState('');
  const [existingUserId, setExistingUserId] = useState('');
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);
  const [linkedUser, setLinkedUser] = useState<{ id: string; email: string; is_active: boolean } | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Entidades de seguridad social y paramétricas laborales
  const {
    eps,
    pensionFunds,
    arls,
    compensationFunds,
    severanceFunds,
    contractTypes,
    workerTypes,
    workerSubtypes,
    arlRisks,
    costCenters,
    loading: loadingEntities,
    loadWorkerSubtypes,
  } = useSocialSecurityEntities();

  // Directores (empleados activos)
  const [directors, setDirectors] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const loadDirectors = async () => {
      try {
        const response = await employeesService.getAll({ status: 'ACTIVE', limit: 100 });
        setDirectors(response.data.map((e) => ({ id: e.id, name: e.name || '' })));
      } catch (err) {
        console.error('Error loading directors:', err);
      }
    };
    loadDirectors();
  }, []);

  // Inicializar usuario vinculado en modo edición
  useEffect(() => {
    if (mode === 'edit' && initialData?.tenant_user) {
      setLinkedUser(initialData.tenant_user);
    }
  }, [mode, initialData]);

  // Cargar roles y usuarios sin vincular
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [rolesData, usersData] = await Promise.all([
          employeesService.getRoles(),
          employeesService.getUnlinkedUsers(),
        ]);
        setRoles(rolesData);
        setUnlinkedUsers(usersData);
      } catch (err) {
        console.error('Error loading roles/users:', err);
      }
    };
    loadUserData();
  }, []);

  // Cargar subtipos cuando cambia el tipo de trabajador
  useEffect(() => {
    if (formData.worker_type_id) {
      loadWorkerSubtypes(formData.worker_type_id);
    }
  }, [formData.worker_type_id, loadWorkerSubtypes]);

  // Inicializar datos de empleado en modo edición
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const contract = initialData.current_contract;
      const salary = initialData.current_salary;
      setFormData({
        hire_date: initialData.hire_date ? initialData.hire_date.split('T')[0] : '',
        contract_end_date: contract?.end_date ? contract.end_date.split('T')[0] : '',
        contract_type_id: contract?.contract_type_id || '',
        worker_type_id: contract?.worker_type_id || '',
        worker_subtype_id: contract?.worker_subtype_id || '',
        position: contract?.position || '',
        probation_days: contract?.probation_days?.toString() || '',
        includes_transport: contract?.includes_transport ?? true,
        is_administrative: initialData.is_administrative || false,
        director_id: initialData.director_id || '',
        cost_center_id: initialData.cost_center_id || '',
        salary: salary?.salary?.toString() || '',
        salary_type: salary?.salary_type || 'ORDINARIO',
        transportation_allowance: salary?.transportation_allowance?.toString() || '',
        variable_salary: salary?.variable_salary ?? false,
        bank_name: initialData.bank_name || '',
        bank_account_type: initialData.bank_account_type || '',
        bank_account_number: initialData.bank_account_number || '',
        eps_id: initialData.eps_id || '',
        pension_fund_id: initialData.pension_fund_id || '',
        arl_id: initialData.arl_id || '',
        arl_risk_id: initialData.arl_risk_class_id || '',
        compensation_fund_id: initialData.compensation_fund_id || '',
        severance_fund_id: initialData.severance_fund_id || '',
      });
    }
  }, [mode, initialData]);

  // Contratos sin fecha fin (término indefinido)
  const INDEFINITE_CONTRACT_TYPE_ID = '2';
  const isIndefiniteContract = formData.contract_type_id === INDEFINITE_CONTRACT_TYPE_ID;

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Si cambia a término indefinido, limpiar fecha fin contrato
      if (field === 'contract_type_id' && value === INDEFINITE_CONTRACT_TYPE_ID) {
        next.contract_end_date = '';
      }
      return next;
    });
  };

  // Vincular usuario en modo edición
  const handleLinkUser = async () => {
    if (userLinkMode === 'create') {
      if (!systemEmail) { toast.error('El email de acceso es requerido'); return; }
      if (!systemPassword || systemPassword.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return; }
    }
    if (userLinkMode === 'existing' && !existingUserId) { toast.error('Debe seleccionar un usuario existente'); return; }

    setUserActionLoading(true);
    try {
      const result = await employeesService.linkUser(initialData!.id, {
        ...(userLinkMode === 'create' && {
          create_system_account: true,
          system_email: systemEmail,
          system_password: systemPassword,
          system_role_id: systemRoleId || undefined,
        }),
        ...(userLinkMode === 'existing' && {
          existing_user_id: existingUserId,
        }),
      });
      toast.success(result.message);
      if (result.user) setLinkedUser(result.user);
      setUserLinkMode('none');
      setSystemEmail('');
      setSystemPassword('');
      setSystemRoleId('');
      setExistingUserId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al vincular usuario');
    } finally {
      setUserActionLoading(false);
    }
  };

  // Desvincular usuario en modo edición
  const handleUnlinkUser = async () => {
    setUserActionLoading(true);
    try {
      const result = await employeesService.unlinkUser(initialData!.id);
      toast.success(result.message);
      setLinkedUser(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al desvincular usuario');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar datos de ThirdParty via ref
    const tpError = thirdPartyRef.current?.validate();
    if (tpError) {
      toast.error(tpError);
      setActiveTab('personal');
      return;
    }

    // Validar datos de empleado
    if (!formData.hire_date) {
      toast.error('La fecha de ingreso es requerida');
      setActiveTab('laboral');
      return;
    }
    if (mode === 'create') {
      if (!formData.contract_type_id) {
        toast.error('El tipo de contrato es requerido');
        setActiveTab('laboral');
        return;
      }
      if (!formData.worker_type_id) {
        toast.error('El tipo de trabajador es requerido');
        setActiveTab('laboral');
        return;
      }
      if (!formData.salary) {
        toast.error('El salario es requerido');
        setActiveTab('laboral');
        return;
      }
    }
    if (userLinkMode === 'create') {
      if (!systemEmail) {
        toast.error('El email de acceso es requerido');
        setActiveTab('laboral');
        return;
      }
      if (!systemPassword || systemPassword.length < 8) {
        toast.error('La contraseña debe tener al menos 8 caracteres');
        setActiveTab('laboral');
        return;
      }
    }
    if (userLinkMode === 'existing' && !existingUserId) {
      toast.error('Debe seleccionar un usuario existente');
      setActiveTab('laboral');
      return;
    }

    // Obtener datos de ThirdParty desde el ref
    const tpData = thirdPartyRef.current!.getFormData();

    setLoading(true);
    try {
      if (mode === 'create') {
        const createData: CreateEmployeeDto = {
          // Datos de ThirdParty
          name: tpData.name,
          type_organization_id: tpData.type_organization_id || undefined,
          type_document_identification_id: tpData.type_document_identification_id || undefined,
          identification_number: tpData.identification_number,
          dv: tpData.dv || undefined,
          email: tpData.email || undefined,
          phone: tpData.phone || undefined,
          address: tpData.address || undefined,
          first_name: tpData.first_name || undefined,
          second_name: tpData.second_name || undefined,
          first_surname: tpData.first_surname || undefined,
          second_surname: tpData.second_surname || undefined,
          department_id: tpData.department_id || undefined,
          municipality_id: tpData.municipality_id || undefined,
          // Datos laborales
          hire_date: formData.hire_date,
          contract_end_date: formData.contract_end_date || undefined,
          contract_type_id: formData.contract_type_id || undefined,
          worker_type_id: formData.worker_type_id || undefined,
          worker_subtype_id: formData.worker_subtype_id || undefined,
          position: formData.position || undefined,
          probation_days: formData.probation_days ? parseInt(formData.probation_days) : undefined,
          includes_transport: formData.includes_transport,
          salary: parseFloat(formData.salary),
          salary_type: (formData.salary_type as any) || undefined,
          transportation_allowance: formData.transportation_allowance ? parseFloat(formData.transportation_allowance) : undefined,
          variable_salary: formData.variable_salary,
          is_administrative: formData.is_administrative,
          director_id: formData.director_id || undefined,
          cost_center_id: formData.cost_center_id || undefined,
          bank_name: formData.bank_name || undefined,
          bank_account_type: formData.bank_account_type || undefined,
          bank_account_number: formData.bank_account_number || undefined,
          eps_id: formData.eps_id || undefined,
          pension_fund_id: formData.pension_fund_id || undefined,
          arl_id: formData.arl_id || undefined,
          arl_risk_id: formData.arl_risk_id || undefined,
          compensation_fund_id: formData.compensation_fund_id || undefined,
          severance_fund_id: formData.severance_fund_id || undefined,
          // Cuenta de usuario
          ...(userLinkMode === 'create' && {
            create_system_account: true,
            system_email: systemEmail || undefined,
            system_password: systemPassword || undefined,
            system_role_id: systemRoleId || undefined,
          }),
          ...(userLinkMode === 'existing' && {
            existing_user_id: existingUserId || undefined,
          }),
        };

        await employeesService.create(createData);
        toast.success('Empleado creado exitosamente');
      } else if (initialData) {
        const updateData: UpdateEmployeeDto = {
          // Datos de ThirdParty
          name: tpData.name,
          type_organization_id: tpData.type_organization_id || undefined,
          type_document_identification_id: tpData.type_document_identification_id || undefined,
          email: tpData.email || undefined,
          phone: tpData.phone || undefined,
          address: tpData.address || undefined,
          first_name: tpData.first_name || undefined,
          second_name: tpData.second_name || undefined,
          first_surname: tpData.first_surname || undefined,
          second_surname: tpData.second_surname || undefined,
          department_id: tpData.department_id || undefined,
          municipality_id: tpData.municipality_id || undefined,
          // Datos laborales del empleado
          hire_date: formData.hire_date || undefined,
          is_administrative: formData.is_administrative,
          director_id: formData.director_id || undefined,
          cost_center_id: formData.cost_center_id || undefined,
          bank_name: formData.bank_name || undefined,
          bank_account_type: formData.bank_account_type || undefined,
          bank_account_number: formData.bank_account_number || undefined,
          eps_id: formData.eps_id || undefined,
          pension_fund_id: formData.pension_fund_id || undefined,
          arl_id: formData.arl_id || undefined,
          arl_risk_id: formData.arl_risk_id || undefined,
          compensation_fund_id: formData.compensation_fund_id || undefined,
          severance_fund_id: formData.severance_fund_id || undefined,
        };

        await employeesService.update(initialData.id, updateData);
        toast.success('Empleado actualizado exitosamente');
      }

      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error al guardar empleado';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Convertir arrays a opciones de SearchableSelect
  const toOptions = (items: Array<{ id: string; name: string; code?: string }>) =>
    items.map((item) => ({
      value: item.id,
      label: item.code ? `${item.code} - ${item.name}` : item.name,
    }));

  // Mapear datos de empleado para ThirdPartyForm en modo edición (memoizado para evitar re-renders)
  const thirdPartyForEdit = useMemo<ThirdParty | undefined>(() => {
    if (mode !== 'edit' || !initialData) return undefined;
    return {
      ...initialData,
      name: initialData.name || '',
      type_organization_id: initialData.type_organization_id || null,
      type_document_identification_id:
        initialData.type_document_identification_id ||
        initialData.type_document_identification?.id || null,
      type_regime_id: initialData.type_regime_id || null,
      type_liability_id: initialData.type_liability_id || null,
      department_id:
        initialData.department_id ||
        initialData.department?.id || null,
      municipality_id:
        initialData.municipality_id ||
        initialData.municipality?.id || null,
      roles: initialData.roles || ['EMPLOYEE'],
      cxc_account_code: null,
      cxp_account_code: null,
      created_at: '',
      updated_at: '',
    } as ThirdParty;
  }, [mode, initialData]);

  if (loadingEntities) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="laboral" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Laboral</span>
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seg. Social</span>
          </TabsTrigger>
          <TabsTrigger value="bancario" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Bancario</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Personal — Reutiliza ThirdPartyForm */}
        <TabsContent value="personal" forceMount className={activeTab !== 'personal' ? 'hidden' : 'mt-4'}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Datos Personales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThirdPartyForm
                ref={thirdPartyRef}
                mode={mode}
                initialData={thirdPartyForEdit}
                forcedRoles={['EMPLOYEE']}
                hideAccounts
                hideButtons
                onSuccess={() => {}}
                onCancel={() => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Laboral + Salarial */}
        <TabsContent value="laboral" forceMount className={activeTab !== 'laboral' ? 'hidden' : 'mt-4'}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Datos Laborales
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Ingreso *</Label>
                <DatePicker
                  value={formData.hire_date}
                  onChange={(v) => handleChange('hire_date', v)}
                  placeholder="Seleccionar fecha..."
                />
              </div>

              {mode === 'create' && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de Contrato *</Label>
                    <SearchableSelect
                      options={toOptions(contractTypes)}
                      value={formData.contract_type_id}
                      onChange={(v) => handleChange('contract_type_id', v)}
                      placeholder="Seleccionar..."
                      searchPlaceholder="Buscar tipo..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={isIndefiniteContract ? 'text-gray-400' : ''}>
                      Fecha Fin Contrato
                    </Label>
                    <DatePicker
                      value={formData.contract_end_date}
                      onChange={(v) => handleChange('contract_end_date', v)}
                      placeholder={isIndefiniteContract ? 'No aplica (Indefinido)' : 'Seleccionar fecha...'}
                      clearable
                      disabled={isIndefiniteContract}
                    />
                    {isIndefiniteContract && (
                      <p className="text-xs text-gray-400">
                        Los contratos a término indefinido no tienen fecha de finalización.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Trabajador *</Label>
                    <SearchableSelect
                      options={toOptions(workerTypes)}
                      value={formData.worker_type_id}
                      onChange={(v) => handleChange('worker_type_id', v)}
                      placeholder="Seleccionar..."
                      searchPlaceholder="Buscar tipo..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subtipo de Trabajador</Label>
                    <SearchableSelect
                      options={toOptions(workerSubtypes)}
                      value={formData.worker_subtype_id}
                      onChange={(v) => handleChange('worker_subtype_id', v)}
                      placeholder="Seleccionar..."
                      searchPlaceholder="Buscar subtipo..."
                      disabled={!formData.worker_type_id}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Cargo / Posición</Label>
                    <Input
                      value={formData.position}
                      onChange={(e) => handleChange('position', e.target.value)}
                      placeholder="Ej: Auxiliar contable"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Días de Prueba</Label>
                    <Input
                      type="number"
                      value={formData.probation_days}
                      onChange={(e) => handleChange('probation_days', e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="includes_transport"
                      checked={formData.includes_transport}
                      onCheckedChange={(checked) => handleChange('includes_transport', !!checked)}
                    />
                    <Label htmlFor="includes_transport" className="font-normal">
                      Incluye Aux. Transporte
                    </Label>
                  </div>
                </>
              )}

              {mode === 'edit' && initialData?.current_contract && (
                <div className="md:col-span-2 p-3 rounded-md border bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Contrato actual</p>
                  <p className="text-sm font-medium">
                    {initialData.current_contract.contract_type?.name || 'Sin tipo'} &mdash;{' '}
                    {initialData.current_contract.worker_type?.name || 'Sin tipo trabajador'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Para cambiar contrato o salario, use la vista de detalle del empleado.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Director / Jefe</Label>
                <SearchableSelect
                  options={directors.map((d) => ({ value: d.id, label: d.name }))}
                  value={formData.director_id}
                  onChange={(v) => handleChange('director_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar director..."
                  clearable
                />
              </div>

              <div className="space-y-2">
                <Label>Centro de Costo</Label>
                <SearchableSelect
                  options={costCenters.map((cc) => ({ value: cc.id, label: `${cc.consecutive} - ${cc.name}` }))}
                  value={formData.cost_center_id}
                  onChange={(v) => handleChange('cost_center_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar centro..."
                  clearable
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="is_administrative"
                  checked={formData.is_administrative}
                  onCheckedChange={(checked) => handleChange('is_administrative', !!checked)}
                />
                <Label htmlFor="is_administrative" className="font-normal">
                  Es personal administrativo
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Datos Salariales */}
          {mode === 'create' ? (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Datos Salariales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salario Mensual *</Label>
                    <NumericInput
                      value={formData.salary}
                      onChange={(e) => handleChange('salary', e.target.value)}
                      placeholder="0"
                      allowNegative={false}
                      maxDecimals={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Salario</Label>
                    <SearchableSelect
                      options={[
                        { value: 'ORDINARIO', label: 'Ordinario' },
                        { value: 'INTEGRAL', label: 'Integral' },
                      ]}
                      value={formData.salary_type}
                      onChange={(v) => handleChange('salary_type', v)}
                      placeholder="Seleccionar..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aux. Transporte (monto)</Label>
                    <NumericInput
                      value={formData.transportation_allowance}
                      onChange={(e) => handleChange('transportation_allowance', e.target.value)}
                      placeholder="0"
                      allowNegative={false}
                      maxDecimals={0}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="variable_salary"
                      checked={formData.variable_salary}
                      onCheckedChange={(checked) => handleChange('variable_salary', !!checked)}
                    />
                    <Label htmlFor="variable_salary" className="font-normal">
                      Salario Variable (comisiones)
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : initialData?.current_salary ? (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Salario Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-md border bg-muted/50 space-y-1">
                  <p className="text-sm font-medium">
                    <FormattedNumber value={initialData.current_salary.salary} type="currency" />
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({initialData.current_salary.salary_type === 'INTEGRAL' ? 'Integral' : 'Ordinario'})
                    </span>
                  </p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {(initialData.current_salary.transportation_allowance ?? 0) > 0 && (
                      <span>Aux. Transporte: <FormattedNumber value={initialData.current_salary.transportation_allowance!} type="currency" /></span>
                    )}
                    {initialData.current_salary.variable_salary && (
                      <span>Salario variable: Si</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para cambiar el salario, use la vista de detalle del empleado.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Cuenta de Usuario */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Cuenta de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Modo edición: usuario ya vinculado */}
              {mode === 'edit' && linkedUser ? (
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{linkedUser.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Estado: {linkedUser.is_active ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleUnlinkUser}
                    disabled={userActionLoading}
                  >
                    {userActionLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Desvincular
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm text-muted-foreground">
                      {mode === 'edit'
                        ? 'Este empleado no tiene cuenta de usuario. Puede crear una o vincular una existente.'
                        : 'Opcionalmente puede crear o vincular una cuenta de acceso al sistema para este empleado.'}
                    </Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={userLinkMode === 'none' ? 'default' : 'outline'}
                        onClick={() => setUserLinkMode('none')}
                      >
                        Sin cuenta
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={userLinkMode === 'create' ? 'default' : 'outline'}
                        onClick={() => setUserLinkMode('create')}
                      >
                        Crear nueva
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={userLinkMode === 'existing' ? 'default' : 'outline'}
                        onClick={() => setUserLinkMode('existing')}
                        disabled={unlinkedUsers.length === 0}
                      >
                        Vincular existente
                      </Button>
                    </div>
                  </div>

                  {userLinkMode === 'create' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Email de acceso *</Label>
                        <Input
                          type="email"
                          value={systemEmail}
                          onChange={(e) => setSystemEmail(e.target.value)}
                          placeholder="correo@empresa.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contraseña *</Label>
                        <Input
                          type="password"
                          value={systemPassword}
                          onChange={(e) => setSystemPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <SearchableSelect
                          options={roles.map((r) => ({ value: r.id, label: r.role_name }))}
                          value={systemRoleId}
                          onChange={(v) => setSystemRoleId(v)}
                          placeholder="Seleccionar rol..."
                          searchPlaceholder="Buscar rol..."
                          clearable
                        />
                        <p className="text-xs text-muted-foreground">
                          Si no selecciona un rol, se asignará el rol &quot;Empleado&quot; por defecto.
                        </p>
                      </div>
                      {mode === 'edit' && (
                        <div className="md:col-span-2 flex justify-end">
                          <Button
                            type="button"
                            onClick={handleLinkUser}
                            disabled={userActionLoading}
                          >
                            {userActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Crear y Vincular
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {userLinkMode === 'existing' && (
                    <div className="pt-2 border-t space-y-3">
                      <div className="space-y-2">
                        <Label>Seleccionar usuario existente *</Label>
                        <SearchableSelect
                          options={unlinkedUsers.map((u) => ({
                            value: u.id,
                            label: `${u.full_name} (${u.email})${u.role ? ` - ${u.role.role_name}` : ''}`,
                          }))}
                          value={existingUserId}
                          onChange={(v) => setExistingUserId(v)}
                          placeholder="Seleccionar usuario..."
                          searchPlaceholder="Buscar usuario..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Solo se muestran usuarios que no están vinculados a ningún tercero.
                        </p>
                      </div>
                      {mode === 'edit' && (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            onClick={handleLinkUser}
                            disabled={userActionLoading || !existingUserId}
                          >
                            {userActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Vincular Usuario
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Seguridad Social */}
        <TabsContent value="seguridad" forceMount className={activeTab !== 'seguridad' ? 'hidden' : 'mt-4'}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Seguridad Social
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>EPS</Label>
                <SearchableSelect
                  options={toOptions(eps)}
                  value={formData.eps_id}
                  onChange={(v) => handleChange('eps_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar EPS..."
                  clearable
                />
              </div>

              <div className="space-y-2">
                <Label>Fondo de Pensiones</Label>
                <SearchableSelect
                  options={toOptions(pensionFunds)}
                  value={formData.pension_fund_id}
                  onChange={(v) => handleChange('pension_fund_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar fondo..."
                  clearable
                />
              </div>

              <div className="space-y-2">
                <Label>ARL</Label>
                <SearchableSelect
                  options={toOptions(arls)}
                  value={formData.arl_id}
                  onChange={(v) => handleChange('arl_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar ARL..."
                  clearable
                />
              </div>

              <div className="space-y-2">
                <Label>Riesgo ARL</Label>
                <SearchableSelect
                  options={arlRisks.map((ar) => ({
                    value: ar.id,
                    label: `Clase ${ar.risk_class || ar.code || ''} - ${ar.name} (${(ar.rate * 100).toFixed(3)}%)`,
                  }))}
                  value={formData.arl_risk_id}
                  onChange={(v) => handleChange('arl_risk_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar riesgo..."
                  clearable
                />
              </div>

              <div className="space-y-2">
                <Label>Caja de Compensación</Label>
                <SearchableSelect
                  options={toOptions(compensationFunds)}
                  value={formData.compensation_fund_id}
                  onChange={(v) => handleChange('compensation_fund_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar caja..."
                  clearable
                />
              </div>

              <div className="space-y-2">
                <Label>Fondo de Cesantías</Label>
                <SearchableSelect
                  options={toOptions(severanceFunds)}
                  value={formData.severance_fund_id}
                  onChange={(v) => handleChange('severance_fund_id', v)}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar fondo..."
                  clearable
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Bancario */}
        <TabsContent value="bancario" forceMount className={activeTab !== 'bancario' ? 'hidden' : 'mt-4'}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Datos Bancarios
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder="Ej: Bancolombia, Davivienda..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Cuenta</Label>
                <SearchableSelect
                  options={BANK_ACCOUNT_TYPE_OPTIONS}
                  value={formData.bank_account_type}
                  onChange={(v) => handleChange('bank_account_type', v)}
                  placeholder="Seleccionar..."
                  clearable
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Número de Cuenta</Label>
                <Input
                  value={formData.bank_account_number}
                  onChange={(e) => handleChange('bank_account_number', e.target.value)}
                  placeholder="Número de cuenta bancaria"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Crear Empleado' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
