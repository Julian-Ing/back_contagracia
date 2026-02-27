// Todos los roles de terceros (incluye EMPLOYEE y CONTACT para display)
export type ThirdPartyRole =
  | 'CLIENT'
  | 'SUPPLIER'
  | 'EMPLOYEE'
  | 'CONTACT'
  | 'EPS'
  | 'PENSION_FUND'
  | 'ARL'
  | 'COMPENSATION_FUND'
  | 'SEVERANCE_FUND'
  | 'SENA'
  | 'ICBF'
  | 'CO_OWNER'
  | 'TENANT'
  | 'OTHER';

// Roles seleccionables desde el formulario de terceros (excluye EMPLOYEE y CONTACT)
export const SELECTABLE_ROLES: ThirdPartyRole[] = [
  'CLIENT',
  'SUPPLIER',
  'EPS',
  'PENSION_FUND',
  'ARL',
  'COMPENSATION_FUND',
  'SEVERANCE_FUND',
  'SENA',
  'ICBF',
  'CO_OWNER',
  'TENANT',
  'OTHER',
];

// Roles de seguridad social
export const SOCIAL_SECURITY_ROLES: ThirdPartyRole[] = [
  'EPS',
  'PENSION_FUND',
  'ARL',
  'COMPENSATION_FUND',
  'SEVERANCE_FUND',
  'SENA',
  'ICBF',
];

// Labels en español
export const ROLE_LABELS: Record<ThirdPartyRole, string> = {
  CLIENT: 'Cliente',
  SUPPLIER: 'Proveedor',
  EMPLOYEE: 'Empleado',
  CONTACT: 'Contacto',
  EPS: 'EPS',
  PENSION_FUND: 'Fondo de Pensiones',
  ARL: 'ARL',
  COMPENSATION_FUND: 'Caja de Compensación',
  SEVERANCE_FUND: 'Fondo de Cesantías',
  SENA: 'SENA',
  ICBF: 'ICBF',
  CO_OWNER: 'Copropietario',
  TENANT: 'Arrendatario',
  OTHER: 'Otro',
};

// Colores por rol
export const ROLE_COLORS: Record<ThirdPartyRole, string> = {
  CLIENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SUPPLIER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EMPLOYEE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  CONTACT: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  EPS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  PENSION_FUND: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  ARL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  COMPENSATION_FUND: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  SEVERANCE_FUND: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  SENA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  ICBF: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  CO_OWNER: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  TENANT: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

// Interface principal
export interface ThirdParty {
  id: string;
  name: string;
  identification_number: string | null;
  dv: string | null;
  type_document_identification_id: string | null;
  type_organization_id: string | null;
  type_regime_id: string | null;
  type_liability_id: string | null;
  roles: ThirdPartyRole[];
  department_id: string | null;
  municipality_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  first_name: string | null;
  second_name: string | null;
  first_surname: string | null;
  second_surname: string | null;
  cxc_account_code: string | null;
  cxp_account_code: string | null;
  // Relations (populated on detail views)
  cxc_account?: { code: string; name: string } | null;
  cxp_account?: { code: string; name: string } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Datos del formulario
export interface ThirdPartyFormData {
  type_organization_id: string;
  name: string;
  first_name: string;
  second_name: string;
  first_surname: string;
  second_surname: string;
  type_document_identification_id: string;
  identification_number: string;
  dv: string;
  email: string;
  phone: string;
  address: string;
  type_regime_id: string;
  type_liability_id: string;
  department_id: string;
  municipality_id: string;
  roles: ThirdPartyRole[];
  cxc_account_code: string;
  cxp_account_code: string;
}

// DTOs
export interface CreateThirdPartyDto {
  name: string;
  identification_number?: string;
  dv?: string;
  type_document_identification_id?: string;
  type_organization_id?: string;
  type_regime_id?: string;
  type_liability_id?: string;
  roles: ThirdPartyRole[];
  department_id?: string;
  municipality_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  first_name?: string;
  second_name?: string;
  first_surname?: string;
  second_surname?: string;
  cxc_account_code?: string;
  cxp_account_code?: string;
}

export type UpdateThirdPartyDto = Partial<CreateThirdPartyDto>;

// Response paginado
export interface ThirdPartiesResponse {
  data: ThirdParty[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filtros
export interface ThirdPartyFilters {
  search?: string;
  role?: ThirdPartyRole;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

// Paramétricas
export interface TypeOrganization {
  id: string;
  code: string;
  name: string;
}

export interface TypeDocumentIdentification {
  id: string;
  code: string;
  name: string;
}

export interface TypeRegime {
  id: string;
  code: string;
  name: string;
}

export interface TypeLiability {
  id: string;
  code: string;
  name: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface Municipality {
  id: string;
  code: string;
  name: string;
  department_id: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
}
