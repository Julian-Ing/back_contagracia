'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { accountingConfigService } from '@/modules/accounting';
import { Loader2, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { thirdPartiesService } from '../services/thirdParties.service';
import { calculateDV, filterDocumentTypes, DEFAULTS } from '../utils';
import type {
  ThirdParty,
  ThirdPartyFormData,
  ThirdPartyRole,
  TypeOrganization,
  TypeDocumentIdentification,
  TypeRegime,
  TypeLiability,
  Department,
  Municipality,
  CreateThirdPartyDto,
} from '../types';
import { ROLE_LABELS, ROLE_COLORS, SELECTABLE_ROLES } from '../types';
import { usePermissions } from '@/shared/hooks';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';

export interface ThirdPartyFormRef {
  validate: () => string | null;
  getFormData: () => ThirdPartyFormData;
}

interface Props {
  mode: 'create' | 'edit';
  initialData?: ThirdParty;
  onSuccess: () => void;
  onCancel: () => void;
  forcedRoles?: ThirdPartyRole[];
  hideAccounts?: boolean;
  hideButtons?: boolean;
}

const EMPTY_FORM: ThirdPartyFormData = {
  type_organization_id: '',
  name: '',
  first_name: '',
  second_name: '',
  first_surname: '',
  second_surname: '',
  type_document_identification_id: '',
  identification_number: '',
  dv: '',
  email: '',
  phone: '',
  address: '',
  type_regime_id: DEFAULTS.REGIME_ID,
  type_liability_id: DEFAULTS.LIABILITY_ID,
  department_id: DEFAULTS.DEPARTMENT_ID,
  municipality_id: DEFAULTS.MUNICIPALITY_ID,
  roles: [],
  cxc_account_code: '',
  cxp_account_code: '',
};

export const ThirdPartyForm = forwardRef<ThirdPartyFormRef, Props>(function ThirdPartyForm(
  { mode, initialData, onSuccess, onCancel, forcedRoles, hideAccounts, hideButtons },
  ref,
) {
  // Permissions & modules
  const { can } = usePermissions();
  const { hasModule } = useCompanyModules();
  const hasAccounting = hasModule('accounting');

  // Form state — inicializar directamente con initialData para evitar race conditions
  const [formData, setFormData] = useState<ThirdPartyFormData>(() => {
    if (mode === 'edit' && initialData) {
      return {
        type_organization_id: initialData.type_organization_id || '',
        name: initialData.name || '',
        first_name: initialData.first_name || '',
        second_name: initialData.second_name || '',
        first_surname: initialData.first_surname || '',
        second_surname: initialData.second_surname || '',
        type_document_identification_id: initialData.type_document_identification_id || '',
        identification_number: initialData.identification_number || '',
        dv: initialData.dv || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        type_regime_id: initialData.type_regime_id || DEFAULTS.REGIME_ID,
        type_liability_id: initialData.type_liability_id || DEFAULTS.LIABILITY_ID,
        department_id: initialData.department_id || DEFAULTS.DEPARTMENT_ID,
        municipality_id: initialData.municipality_id || DEFAULTS.MUNICIPALITY_ID,
        roles: initialData.roles || [],
        cxc_account_code: initialData.cxc_account_code || '',
        cxp_account_code: initialData.cxp_account_code || '',
      };
    }
    return EMPTY_FORM;
  });

  // Loading states
  const [saving, setSaving] = useState(false);
  const [loadingParams, setLoadingParams] = useState(true);
  const [loadingRut, setLoadingRut] = useState(false);
  const [checkingId, setCheckingId] = useState(false);

  // Validation states
  const [idExists, setIdExists] = useState<boolean | null>(null);
  const [existingThirdParty, setExistingThirdParty] = useState<ThirdParty | null>(null);

  // Parametric data
  const [organizations, setOrganizations] = useState<TypeOrganization[]>([]);
  const [documentTypes, setDocumentTypes] = useState<TypeDocumentIdentification[]>([]);
  const [regimes, setRegimes] = useState<TypeRegime[]>([]);
  const [liabilities, setLiabilities] = useState<TypeLiability[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

  // Labels para AsyncSearchableSelect (evitan recarga)
  const [cxcAccountLabel, setCxcAccountLabel] = useState<string>(() => {
    if (mode === 'edit' && initialData?.cxc_account_code) {
      return `${initialData.cxc_account_code} - ${initialData.cxc_account?.name || ''}`;
    }
    return '';
  });
  const [cxpAccountLabel, setCxpAccountLabel] = useState<string>(() => {
    if (mode === 'edit' && initialData?.cxp_account_code) {
      return `${initialData.cxp_account_code} - ${initialData.cxp_account?.name || ''}`;
    }
    return '';
  });


  // Load parametric data (catálogos pequeños se cargan todos)
  useEffect(() => {
    const loadParams = async () => {
      setLoadingParams(true);
      try {
        const [orgs, docs, regs, liabs, depts] = await Promise.all([
          thirdPartiesService.getTypeOrganizations(),
          thirdPartiesService.getTypeDocumentIdentifications(),
          thirdPartiesService.getTypeRegimes(),
          thirdPartiesService.getTypeLiabilities(),
          thirdPartiesService.getDepartments(),
        ]);
        setOrganizations(orgs);
        setDocumentTypes(docs);
        setRegimes(regs);
        setLiabilities(liabs);
        setDepartments(depts);
      } catch (error) {
        console.error('[ThirdPartyForm] Error loading parametrics:', error);
        toast.error('Error al cargar datos');
      } finally {
        setLoadingParams(false);
      }
    };
    loadParams();
  }, []);

  // Precargar cuentas CxC/CxP desde accounting config si están vacías (solo si tiene permiso)
  useEffect(() => {
    const loadDefaultAccounts = async () => {
      // Solo cargar si tiene permiso y ambas están vacías
      if (!hasAccounting || hideAccounts || forcedRoles) return;
      if (formData.cxc_account_code || formData.cxp_account_code) return;
      // Esperar a que termine de cargar initialData en edit mode
      if (mode === 'edit' && !initialData) return;

      try {
        const [cxcConfig, cxpConfig] = await Promise.all([
          accountingConfigService.getByKey('finance_cxc'),
          accountingConfigService.getByKey('finance_cxp'),
        ]);

        if (cxcConfig?.account_code && cxcConfig.account) {
          setFormData((prev) => ({ ...prev, cxc_account_code: cxcConfig.account_code! }));
          setCxcAccountLabel(`${cxcConfig.account.code} - ${cxcConfig.account.name}`);
        }

        if (cxpConfig?.account_code && cxpConfig.account) {
          setFormData((prev) => ({ ...prev, cxp_account_code: cxpConfig.account_code! }));
          setCxpAccountLabel(`${cxpConfig.account.code} - ${cxpConfig.account.name}`);
        }
      } catch (error) {
        console.error('[ThirdPartyForm] Error loading default accounts:', error);
      }
    };

    if (!loadingParams) {
      loadDefaultAccounts();
    }
  }, [loadingParams, mode, initialData, formData.cxc_account_code, formData.cxp_account_code, hasAccounting]);

  // Load municipalities when department changes (con protección contra race conditions)
  useEffect(() => {
    if (!formData.department_id) {
      setMunicipalities([]);
      return;
    }
    let stale = false;
    thirdPartiesService.getMunicipalities(formData.department_id)
      .then((munis) => {
        if (stale) return;
        setMunicipalities(munis);
        // Auto-seleccionar si solo hay 1 municipio y no hay selección
        if (munis.length === 1 && !formData.municipality_id) {
          setFormData((prev) => ({ ...prev, municipality_id: munis[0].id }));
        }
      })
      .catch((err) => {
        if (stale) return;
        console.error('[ThirdPartyForm] Error loading municipalities:', err);
        setMunicipalities([]);
      });
    return () => { stale = true; };
  }, [formData.department_id]);

  // Nota: la inicialización con initialData se hace en useState() directamente
  // para evitar race conditions con el efecto de municipios.

  // Auto-calculate DV when identification number changes
  useEffect(() => {
    if (formData.identification_number) {
      const dv = calculateDV(formData.identification_number);
      if (dv !== formData.dv) {
        setFormData((prev) => ({ ...prev, dv }));
      }
    }
  }, [formData.identification_number, formData.dv]);

  // Build name from parts when natural person
  useEffect(() => {
    if (formData.type_organization_id === '2') {
      const parts = [
        formData.first_name,
        formData.second_name,
        formData.first_surname,
        formData.second_surname,
      ]
        .filter(Boolean)
        .join(' ');
      if (parts && parts !== formData.name) {
        setFormData((prev) => ({ ...prev, name: parts }));
      }
    }
  }, [
    formData.type_organization_id,
    formData.first_name,
    formData.second_name,
    formData.first_surname,
    formData.second_surname,
    formData.name,
  ]);

  // Filter document types by organization type
  const filteredDocTypes = filterDocumentTypes(documentTypes, formData.type_organization_id);

  // Check if identification exists (debounced)
  const checkIdExists = useCallback(async () => {
    if (!formData.identification_number || mode === 'edit') {
      setIdExists(null);
      setExistingThirdParty(null);
      return;
    }

    setCheckingId(true);
    try {
      const result = await thirdPartiesService.exists(formData.identification_number);
      setIdExists(result.exists);
      setExistingThirdParty(result.thirdParty || null);
    } catch {
      setIdExists(null);
    } finally {
      setCheckingId(false);
    }
  }, [formData.identification_number, mode]);

  useEffect(() => {
    const timer = setTimeout(checkIdExists, 500);
    return () => clearTimeout(timer);
  }, [checkIdExists]);

  // Validation (extracted for reuse via ref)
  const validate = useCallback((): string | null => {
    if (!formData.type_organization_id) return 'Selecciona el tipo de persona';
    if (formData.type_organization_id === '2') {
      if (!formData.first_name || !formData.first_surname) return 'Ingresa al menos primer nombre y primer apellido';
    } else if (!formData.name) {
      return 'Ingresa la razón social';
    }
    if (!formData.type_document_identification_id) return 'Selecciona el tipo de documento';
    if (!formData.identification_number) return 'Ingresa el número de identificación';
    if (!formData.email) return 'Ingresa el correo electrónico';
    if (!formData.phone) return 'Ingresa el teléfono';
    if (!formData.type_regime_id) return 'Selecciona el régimen';
    if (!formData.type_liability_id) return 'Selecciona la responsabilidad fiscal';
    if (!formData.department_id) return 'Selecciona el departamento';
    if (!formData.municipality_id) return 'Selecciona el municipio';
    if (!formData.address) return 'Ingresa la dirección';
    if (!forcedRoles && formData.roles.length === 0) return 'Selecciona al menos un rol';
    if (mode === 'create' && idExists) return 'Ya existe un tercero con este número de identificación';
    if (!forcedRoles && !hideAccounts && hasAccounting) {
      if (!formData.cxc_account_code) return 'Selecciona una cuenta CxC';
      if (!formData.cxp_account_code) return 'Selecciona una cuenta CxP';
    }
    return null;
  }, [formData, forcedRoles, hideAccounts, hasAccounting, idExists, mode]);

  useImperativeHandle(ref, () => ({
    validate,
    getFormData: () => forcedRoles ? { ...formData, roles: forcedRoles } : formData,
  }), [validate, formData, forcedRoles]);

  // Handle RUT query
  const handleRutQuery = async () => {
    if (!formData.identification_number) {
      toast.error('Ingresa un número de identificación');
      return;
    }

    setLoadingRut(true);
    try {
      const result = await thirdPartiesService.queryRut(formData.identification_number);
      if (result.success && result.data) {
        const businessName = result.data!.business_name || '';
        const email = result.data!.email || '';

        // Si es persona natural, parsear nombre completo
        // DIAN devuelve: "PRIMER_APELLIDO SEGUNDO_APELLIDO PRIMER_NOMBRE OTROS_NOMBRES"
        const isNaturalPerson = formData.type_organization_id === '2';
        if (isNaturalPerson && businessName) {
          const parts = businessName.trim().split(/\s+/);
          let firstName = '';
          let secondName = '';
          let firstSurname = '';
          let secondSurname = '';

          if (parts.length >= 4) {
            // 4+ palabras: AP1 AP2 NOM1 NOM2...
            firstSurname = parts[0];
            secondSurname = parts[1];
            firstName = parts[2];
            secondName = parts.slice(3).join(' ');
          } else if (parts.length === 3) {
            // 3 palabras: AP1 AP2 NOM1 o AP1 NOM1 NOM2
            firstSurname = parts[0];
            secondSurname = parts[1];
            firstName = parts[2];
          } else if (parts.length === 2) {
            // 2 palabras: AP1 NOM1
            firstSurname = parts[0];
            firstName = parts[1];
          } else if (parts.length === 1) {
            firstName = parts[0];
          }

          setFormData((prev) => ({
            ...prev,
            first_name: firstName,
            second_name: secondName,
            first_surname: firstSurname,
            second_surname: secondSurname,
            name: businessName,
            email: email || prev.email,
          }));
        } else {
          // Persona jurídica: solo razón social
          setFormData((prev) => ({
            ...prev,
            name: businessName || prev.name,
            email: email || prev.email,
          }));
        }
        toast.success('Datos obtenidos de la DIAN');
      } else {
        toast.error(result.message || 'No se encontraron datos');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al consultar RUT');
    } finally {
      setLoadingRut(false);
    }
  };

  // Handle organization type change
  const handleOrgTypeChange = (value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, type_organization_id: value };
      // Clear document type if incompatible
      if (value === '1') {
        // Jurídica
        if (!['6', '9'].includes(prev.type_document_identification_id)) {
          updated.type_document_identification_id = '';
        }
        // Clear natural person fields
        updated.first_name = '';
        updated.second_name = '';
        updated.first_surname = '';
        updated.second_surname = '';
      } else if (value === '2') {
        // Natural
        if (['6', '9'].includes(prev.type_document_identification_id)) {
          updated.type_document_identification_id = '';
        }
      }
      return updated;
    });
  };

  // Handle role toggle - cualquier combinación es válida
  const handleRoleToggle = (role: ThirdPartyRole) => {
    setFormData((prev) => {
      const hasRole = prev.roles.includes(role);
      const newRoles = hasRole
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles: newRoles };
    });
  };

  // Handle save
  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name,
        identification_number: formData.identification_number,
        dv: formData.dv,
        type_document_identification_id: formData.type_document_identification_id,
        type_organization_id: formData.type_organization_id,
        type_regime_id: formData.type_regime_id,
        type_liability_id: formData.type_liability_id,
        roles: formData.roles,
        department_id: formData.department_id,
        municipality_id: formData.municipality_id,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        first_name: formData.first_name || undefined,
        second_name: formData.second_name || undefined,
        first_surname: formData.first_surname || undefined,
        second_surname: formData.second_surname || undefined,
      };

      // Solo incluir cuentas si tiene permiso
      if (hasAccounting) {
        payload.cxc_account_code = formData.cxc_account_code;
        payload.cxp_account_code = formData.cxp_account_code;
      }

      if (mode === 'create') {
        await thirdPartiesService.create(payload as CreateThirdPartyDto);
        toast.success('Tercero creado exitosamente');
      } else {
        await thirdPartiesService.update(initialData!.id, payload as CreateThirdPartyDto);
        toast.success('Tercero actualizado exitosamente');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loadingParams) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando datos...</span>
      </div>
    );
  }

  const isNatural = formData.type_organization_id === '2';

  return (
    <div className="space-y-6">
      {/* Tipo de Persona */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Persona *</Label>
          <SearchableSelect
            options={organizations.map((org) => ({
              value: org.id,
              label: org.name,
            }))}
            value={formData.type_organization_id}
            onChange={handleOrgTypeChange}
            placeholder="Selecciona..."
            searchPlaceholder="Buscar tipo..."
          />
        </div>

        {/* Razón Social (Jurídica) */}
        {!isNatural && (
          <div className="md:col-span-2 space-y-2">
            <Label>Razón Social *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Mi Empresa SAS"
            />
          </div>
        )}
      </section>

      {/* Nombres (solo Persona Natural) - fila separada */}
      {isNatural && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Primer Nombre *</Label>
            <Input
              value={formData.first_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
              placeholder="Juan"
            />
          </div>
          <div className="space-y-2">
            <Label>Segundo Nombre</Label>
            <Input
              value={formData.second_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, second_name: e.target.value }))}
              placeholder="Carlos"
            />
          </div>
          <div className="space-y-2">
            <Label>Primer Apellido *</Label>
            <Input
              value={formData.first_surname}
              onChange={(e) => setFormData((prev) => ({ ...prev, first_surname: e.target.value }))}
              placeholder="Pérez"
            />
          </div>
          <div className="space-y-2">
            <Label>Segundo Apellido</Label>
            <Input
              value={formData.second_surname}
              onChange={(e) => setFormData((prev) => ({ ...prev, second_surname: e.target.value }))}
              placeholder="López"
            />
          </div>
        </section>
      )}

      {/* Sección Identificación - 3 columnas */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tipo de Documento */}
        <div className="space-y-2">
          <Label>Tipo de Identificación *</Label>
          <SearchableSelect
            options={filteredDocTypes.map((doc) => ({
              value: doc.id,
              label: doc.name,
            }))}
            value={formData.type_document_identification_id}
            onChange={(v) => setFormData((prev) => ({ ...prev, type_document_identification_id: v }))}
            placeholder="Selecciona..."
            searchPlaceholder="Buscar tipo..."
            disabled={!formData.type_organization_id}
          />
        </div>

        {/* Número + DV + Botón DIAN */}
        <div className="lg:col-span-2 space-y-2">
          <Label>Número de Identificación *</Label>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={formData.identification_number}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  identification_number: e.target.value.replace(/\D/g, ''),
                }))
              }
              placeholder="123456789"
            />
            <Input
              className="w-16 text-center"
              value={formData.dv}
              readOnly
              placeholder="DV"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleRutQuery}
              disabled={loadingRut || !formData.identification_number}
              title="Consultar RUT en DIAN"
            >
              {loadingRut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">DV automático. Consulta DIAN con el botón.</span>
            {checkingId && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando...
              </span>
            )}
            {!checkingId && idExists === true && existingThirdParty && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3 w-3" />
                Ya existe: {existingThirdParty.name}
              </span>
            )}
            {!checkingId && idExists === false && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Disponible
              </span>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label>Correo Electrónico *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="correo@ejemplo.com"
          />
        </div>

        {/* Teléfono */}
        <div className="space-y-2">
          <Label>Teléfono *</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="3001234567"
          />
        </div>
      </section>

      {/* Ubicación y Fiscales */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Régimen *</Label>
          <SearchableSelect
            options={regimes.map((r) => ({ value: r.id, label: r.name }))}
            value={formData.type_regime_id}
            onChange={(v) => setFormData((prev) => ({ ...prev, type_regime_id: v }))}
            placeholder="Seleccionar régimen"
            searchPlaceholder="Buscar..."
          />
        </div>
        <div className="space-y-2">
          <Label>Responsabilidad Fiscal *</Label>
          <SearchableSelect
            options={liabilities.map((l) => ({ value: l.id, label: l.name }))}
            value={formData.type_liability_id}
            onChange={(v) => setFormData((prev) => ({ ...prev, type_liability_id: v }))}
            placeholder="Seleccionar responsabilidad"
            searchPlaceholder="Buscar..."
          />
        </div>
        <div className="space-y-2">
          <Label>Departamento *</Label>
          <SearchableSelect
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={formData.department_id}
            onChange={(v) => setFormData((prev) => ({ ...prev, department_id: v, municipality_id: '' }))}
            placeholder="Seleccionar departamento"
            searchPlaceholder="Buscar departamento..."
          />
        </div>
        <div className="space-y-2">
          <Label>Municipio *</Label>
          <SearchableSelect
            options={municipalities.map((m) => ({ value: m.id, label: m.name }))}
            value={formData.municipality_id}
            onChange={(v) => setFormData((prev) => ({ ...prev, municipality_id: v }))}
            placeholder={formData.department_id ? 'Seleccionar municipio' : 'Seleccione departamento'}
            searchPlaceholder="Buscar municipio..."
            disabled={!formData.department_id}
          />
        </div>
        <div className="lg:col-span-2 space-y-2">
          <Label>Dirección *</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Cra 1 # 2 - 34, Bogotá"
          />
        </div>
      </section>

      {/* Sección Roles - Only show when roles are not forced */}
      {!forcedRoles && (
      <section className="space-y-4">
        <Label className="text-base font-semibold">Roles *</Label>
        <p className="text-sm text-muted-foreground -mt-2">Selecciona los roles que aplican. Se pueden combinar todos.</p>

        {/* Grid de roles */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {SELECTABLE_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleToggle(role)}
              className={`px-2 py-2 rounded-lg border text-center transition-all ${
                formData.roles.includes(role)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className={`text-xs font-medium ${formData.roles.includes(role) ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                  {ROLE_LABELS[role]}
                </span>
                {formData.roles.includes(role) && (
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Cuentas Contables - solo si tiene permiso y no están ocultas */}
        {hasAccounting && !hideAccounts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Cuenta CxC *</Label>
              <AccountSelect
                value={formData.cxc_account_code}
                valueLabel={cxcAccountLabel}
                onChange={(code, account) => {
                  setFormData((prev) => ({ ...prev, cxc_account_code: code }));
                  setCxcAccountLabel(account ? `${account.code} - ${account.name}` : '');
                }}
                placeholder="Seleccionar cuenta CxC..."
                excludePrefixes="1110,1105"
              />
            </div>
            <div className="space-y-2">
              <Label>Cuenta CxP *</Label>
              <AccountSelect
                value={formData.cxp_account_code}
                valueLabel={cxpAccountLabel}
                onChange={(code, account) => {
                  setFormData((prev) => ({ ...prev, cxp_account_code: code }));
                  setCxpAccountLabel(account ? `${account.code} - ${account.name}` : '');
                }}
                placeholder="Seleccionar cuenta CxP..."
                excludePrefixes="1110,1105"
              />
            </div>
          </div>
        )}

        {/* Roles seleccionados */}
        {formData.roles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">Seleccionados:</span>
            {formData.roles.map((role) => (
              <span
                key={role}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}
              >
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        )}
      </section>
      )}

      {/* Botones de Acción */}
      {!hideButtons && (
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Crear Tercero' : 'Guardar Cambios'}
        </Button>
      </div>
      )}

    </div>
  );
});
