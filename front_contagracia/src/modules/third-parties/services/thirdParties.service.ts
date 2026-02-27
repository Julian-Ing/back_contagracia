import { queryRut as dianQueryRut } from '@/shared/services/api/dianClient';
import { companyClient, adminClient, accountingClient } from '@/shared/services/api/apiClient';
import type { LoadOptionsResult } from '@/shared/components/ui/async-searchable-select';
import type {
  ThirdParty,
  ThirdPartiesResponse,
  ThirdPartyFilters,
  CreateThirdPartyDto,
  UpdateThirdPartyDto,
  TypeOrganization,
  TypeDocumentIdentification,
  TypeRegime,
  TypeLiability,
  Department,
  Municipality,
} from '../types';

export const thirdPartiesService = {
  // ==================== CRUD TERCEROS (COMPANY SERVICE) ====================

  /**
   * Obtener lista de terceros con filtros y paginación
   */
  async getAll(filters: ThirdPartyFilters = {}): Promise<ThirdPartiesResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.role) params.role = filters.role;
    if (filters.is_active !== undefined) params.is_active = String(filters.is_active);
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await companyClient.get<ThirdPartiesResponse>('/third-parties', { params });
    return response.data;
  },

  /**
   * Obtener un tercero por ID
   */
  async getOne(id: string): Promise<ThirdParty> {
    const response = await companyClient.get<ThirdParty>(`/third-parties/${id}`);
    return response.data;
  },

  /**
   * Verificar si existe un tercero por número de identificación
   */
  async exists(identificationNumber: string): Promise<{ exists: boolean; thirdParty?: ThirdParty }> {
    const response = await companyClient.get<{ exists: boolean; thirdParty?: ThirdParty }>(
      `/third-parties/exists/${encodeURIComponent(identificationNumber)}`
    );
    return response.data;
  },

  /**
   * Crear un nuevo tercero
   */
  async create(data: CreateThirdPartyDto): Promise<ThirdParty> {
    const response = await companyClient.post<ThirdParty>('/third-parties', data);
    return response.data;
  },

  /**
   * Actualizar un tercero existente
   */
  async update(id: string, data: UpdateThirdPartyDto): Promise<ThirdParty> {
    const response = await companyClient.put<ThirdParty>(`/third-parties/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar (desactivar) un tercero
   */
  async delete(id: string): Promise<void> {
    await companyClient.delete(`/third-parties/${id}`);
  },

  /**
   * Consultar RUT en la DIAN (usa el cliente existente)
   */
  async queryRut(identificationNumber: string): Promise<{
    success: boolean;
    message: string;
    data?: { business_name?: string; email?: string };
  }> {
    return dianQueryRut(identificationNumber);
  },

  /**
   * Obtener terceros por rol específico (para selectores de entidades SS)
   */
  async getByRole(role: string): Promise<ThirdParty[]> {
    const response = await companyClient.get<ThirdPartiesResponse>('/third-parties', {
      params: { role, is_active: 'true', limit: '1000' },
    });
    return response.data.data;
  },

  // ==================== PARAMÉTRICAS (ADMIN SERVICE - MASTER DB) ====================

  /**
   * Fetch genérico de catálogos desde admin-service
   */
  async fetchCatalog<T extends { id: string; name: string }>(table: string): Promise<T[]> {
    try {
      const response = await adminClient.get(`/admin/catalogs/${table}`);
      const data = response.data;
      const items = data.data || data;
      return items.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        code: item.code,
        ...item,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Obtener tipos de organización
   */
  async getTypeOrganizations(): Promise<TypeOrganization[]> {
    return this.fetchCatalog<TypeOrganization>('type-organizations');
  },

  /**
   * Obtener tipos de documento de identificación
   */
  async getTypeDocumentIdentifications(): Promise<TypeDocumentIdentification[]> {
    return this.fetchCatalog<TypeDocumentIdentification>('type-document-identifications');
  },

  /**
   * Obtener tipos de régimen
   */
  async getTypeRegimes(): Promise<TypeRegime[]> {
    return this.fetchCatalog<TypeRegime>('type-regimes');
  },

  /**
   * Obtener tipos de responsabilidad fiscal
   */
  async getTypeLiabilities(): Promise<TypeLiability[]> {
    return this.fetchCatalog<TypeLiability>('type-liabilities');
  },

  /**
   * Obtener departamentos
   */
  async getDepartments(): Promise<Department[]> {
    return this.fetchCatalog<Department>('departments');
  },

  /**
   * Obtener municipios por departamento
   */
  async getMunicipalities(departmentId?: string): Promise<Municipality[]> {
    if (!departmentId) {
      return this.fetchCatalog<Municipality>('municipalities');
    }
    try {
      const response = await adminClient.get(
        `/admin/catalogs/municipalities/by-department/${departmentId}`
      );
      return response.data.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        department_id: String(item.department_id),
        code: item.code,
      }));
    } catch {
      return [];
    }
  },

  // ==================== ASYNC LOAD FUNCTIONS (para AsyncSearchableSelect) ====================

  /**
   * Carga opciones de catálogo con búsqueda y paginación (backend)
   */
  async loadCatalogOptions(
    table: string,
    search: string,
    page: number,
    limit = 30
  ): Promise<LoadOptionsResult> {
    try {
      const response = await adminClient.get(`/admin/catalogs/${table}`, {
        params: {
          page: String(page),
          limit: String(limit),
          active: 'true',
          search: search || undefined,
        },
      });

      const result = response.data;
      return {
        data: (result.data || []).map((item: any) => ({
          value: String(item.id),
          label: item.name,
          description: item.code || undefined,
        })),
        hasMore: result.hasMore || false,
        total: result.total || 0,
      };
    } catch {
      return { data: [], hasMore: false, total: 0 };
    }
  },

  /**
   * Carga cuentas contables con prefijo de código (CxC=13, CxP=22)
   * Toda la lógica de filtro por código es backend
   */
  async loadAccountOptions(
    codePrefix: string,
    search: string,
    page: number,
    limit = 30
  ): Promise<LoadOptionsResult> {
    try {
      const response = await accountingClient.get('/chart-of-accounts', {
        params: {
          code_prefix: codePrefix,
          search: search || undefined,
          page,
          limit,
          flat: 'true', // Retorna lista plana, no árbol
        },
      });

      const result = response.data;
      // Con flat=true, data ya es lista plana
      const accounts = result.data || [];

      return {
        data: accounts.map((acc: any) => ({
          value: acc.code,
          label: `${acc.code} - ${acc.name}`,
        })),
        hasMore: result.hasMore || false,
        total: result.total || 0,
      };
    } catch {
      return { data: [], hasMore: false, total: 0 };
    }
  },

  /**
   * Load CxC accounts (code_prefix=13)
   */
  loadCxcAccounts(search: string, page: number): Promise<LoadOptionsResult> {
    return this.loadAccountOptions('13', search, page);
  },

  /**
   * Load CxP accounts (code_prefix=22)
   */
  loadCxpAccounts(search: string, page: number): Promise<LoadOptionsResult> {
    return this.loadAccountOptions('22', search, page);
  },

  /**
   * Load departments with search
   */
  loadDepartments(search: string, page: number): Promise<LoadOptionsResult> {
    return this.loadCatalogOptions('departments', search, page);
  },

  /**
   * Load municipalities by department with search
   */
  async loadMunicipalities(
    departmentId: string,
    search: string,
    page: number
  ): Promise<LoadOptionsResult> {
    if (!departmentId) return { data: [], hasMore: false, total: 0 };

    try {
      const response = await adminClient.get('/admin/catalogs/municipalities', {
        params: {
          page: String(page),
          limit: '30',
          active: 'true',
          search: search || undefined,
        },
      });

      const result = response.data;
      // Filter by department_id on frontend (backend filters by search, we filter by department)
      const filtered = (result.data || []).filter(
        (m: any) => String(m.department_id) === departmentId
      );

      return {
        data: filtered.map((item: any) => ({
          value: String(item.id),
          label: item.name,
        })),
        hasMore: result.hasMore || false,
        total: filtered.length,
      };
    } catch {
      return { data: [], hasMore: false, total: 0 };
    }
  },
};

/**
 * Flatten account tree to a flat list
 */
function flattenAccountTree(nodes: any[]): any[] {
  const result: any[] = [];
  for (const node of nodes) {
    result.push({ code: node.code, name: node.name });
    if (node.children?.length > 0) {
      result.push(...flattenAccountTree(node.children));
    }
  }
  return result;
}
