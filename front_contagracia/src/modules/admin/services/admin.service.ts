/**
 * Admin Service - API calls for admin-service microservice
 * Consume endpoints de admin-service para plans, system-actions y catalogs
 */

import { adminClient, mediaClient } from '@/shared/services/api/apiClient';
import type {
  AdminOverview,
  Plan,
  CreatePlanDto,
  UpdatePlanDto,
  PlanModule,
  SetPlanModulesDto,
  Module,
  SystemAction,
  SystemModule,
  CreateSystemActionDto,
  UpdateSystemActionDto,
  CatalogItem,
  Department,
  Municipality,
  Company,
  CompanyCategory,
  CategoryWithCount,
  CategoryFormData,
  CompanyQueryParams,
  PaginatedResponse,
  ManageSubscriptionDto,
  ImpersonateResponse,
} from '@/modules/admin/types';

// Base URL para admin-service
const ADMIN_BASE = '/admin';

/**
 * Servicio de administración
 * Consume endpoints del admin-service
 */
export const adminService = {
  // ===== OVERVIEW =====

  /**
   * Get full system overview with stats and recent users
   */
  getSystemOverview: async (): Promise<AdminOverview> => {
    const response = await adminClient.get(`${ADMIN_BASE}/overview`);
    return response.data;
  },

  /**
   * Get all users with pagination
   */
  getUsers: async (page = 1, limit = 10) => {
    const response = await adminClient.get(`${ADMIN_BASE}/users`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get all companies with pagination and filters
   */
  getCompanies: async (params: CompanyQueryParams = {}): Promise<PaginatedResponse<Company>> => {
    const response = await adminClient.get(`${ADMIN_BASE}/companies`, { params });
    return response.data;
  },

  /**
   * Cambiar rol del owner de la compañía
   */
  updateCompanyRole: async (companyId: string, role: string): Promise<void> => {
    await adminClient.patch(`${ADMIN_BASE}/companies/${companyId}/role`, { role });
  },

  /**
   * Activar/inactivar compañía
   */
  updateCompanyStatus: async (companyId: string, status: string): Promise<void> => {
    await adminClient.patch(`${ADMIN_BASE}/companies/${companyId}/status`, { status });
  },

  /**
   * Gestionar suscripción de la compañía
   */
  manageSubscription: async (companyId: string, data: ManageSubscriptionDto): Promise<void> => {
    await adminClient.patch(`${ADMIN_BASE}/companies/${companyId}/subscription`, data);
  },

  /**
   * Asignar categorías a una compañía (reemplaza las existentes)
   */
  assignCategories: async (companyId: string, categoryIds: string[]): Promise<void> => {
    await adminClient.put(`${ADMIN_BASE}/companies/${companyId}/categories`, {
      category_ids: categoryIds,
    });
  },

  /**
   * Eliminar una compañía
   */
  deleteCompany: async (companyId: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BASE}/companies/${companyId}`);
  },

  /**
   * Login como compañía (impersonate)
   */
  impersonateCompany: async (companyId: string): Promise<ImpersonateResponse> => {
    const response = await adminClient.post(`${ADMIN_BASE}/companies/${companyId}/impersonate`);
    return response.data;
  },

  // ===== CATEGORIES =====

  /**
   * Listar todas las categorías con conteo de compañías
   */
  getCategories: async (): Promise<CategoryWithCount[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/categories`);
    return response.data.map((cat: any) => ({
      ...cat,
      company_count: cat._count?.assignments || 0,
    }));
  },

  /**
   * Crear una nueva categoría
   */
  createCategory: async (data: CategoryFormData): Promise<CompanyCategory> => {
    const response = await adminClient.post(`${ADMIN_BASE}/categories`, data);
    return response.data;
  },

  /**
   * Actualizar una categoría
   */
  updateCategory: async (id: string, data: CategoryFormData): Promise<CompanyCategory> => {
    const response = await adminClient.patch(`${ADMIN_BASE}/categories/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar una categoría
   */
  deleteCategory: async (id: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BASE}/categories/${id}`);
  },

  // ===== PLANS =====

  /**
   * Listar todos los planes
   * GET /admin/plans
   */
  getPlans: async (includeInactive = false): Promise<Plan[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/plans`, {
      params: { includeInactive },
    });
    return response.data;
  },

  /**
   * Obtener un plan por ID
   * GET /admin/plans/:id
   */
  getPlan: async (planId: string): Promise<Plan> => {
    const response = await adminClient.get(`${ADMIN_BASE}/plans/${planId}`);
    return response.data;
  },

  /**
   * Crear un nuevo plan
   * POST /admin/plans
   */
  createPlan: async (data: CreatePlanDto): Promise<Plan> => {
    const response = await adminClient.post(`${ADMIN_BASE}/plans`, data);
    return response.data;
  },

  /**
   * Actualizar un plan
   * PATCH /admin/plans/:id
   */
  updatePlan: async (planId: string, data: UpdatePlanDto): Promise<Plan> => {
    const response = await adminClient.patch(`${ADMIN_BASE}/plans/${planId}`, data);
    return response.data;
  },

  /**
   * Eliminar un plan
   * DELETE /admin/plans/:id
   */
  deletePlan: async (planId: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BASE}/plans/${planId}`);
  },

  /**
   * Obtener módulos de un plan
   * GET /admin/plans/:id/modules
   */
  getPlanModules: async (planId: string): Promise<PlanModule[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/plans/${planId}/modules`);
    return response.data;
  },

  /**
   * Configurar todos los módulos de un plan (reemplaza los existentes)
   * POST /admin/plans/:id/modules
   */
  setPlanModules: async (planId: string, data: SetPlanModulesDto): Promise<PlanModule[]> => {
    const response = await adminClient.post(`${ADMIN_BASE}/plans/${planId}/modules`, data);
    return response.data;
  },

  /**
   * Agregar un módulo al plan
   * POST /admin/plans/:id/modules/add
   */
  addPlanModule: async (planId: string, moduleId: string): Promise<PlanModule> => {
    const response = await adminClient.post(`${ADMIN_BASE}/plans/${planId}/modules/add`, {
      module_id: moduleId,
    });
    return response.data;
  },

  /**
   * Remover un módulo del plan
   * DELETE /admin/plans/:id/modules/:moduleId
   */
  removePlanModule: async (planId: string, moduleId: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BASE}/plans/${planId}/modules/${moduleId}`);
  },

  // ===== MODULES =====

  /**
   * Listar todos los módulos del sistema
   * GET /admin/system-actions/modules/all
   */
  getAllModules: async (search?: string): Promise<Module[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/system-actions/modules/all`, {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  // ===== SYSTEM ACTIONS =====

  /**
   * Listar todas las acciones del sistema
   * GET /admin/system-actions
   */
  getSystemActions: async (moduleKey?: string): Promise<SystemAction[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/system-actions`, {
      params: moduleKey ? { module: moduleKey } : undefined,
    });
    return response.data;
  },

  /**
   * Listar todos los módulos disponibles
   * GET /admin/system-actions/modules
   */
  getModules: async (): Promise<SystemModule[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/system-actions/modules`);
    return response.data;
  },

  /**
   * Obtener una acción por ID
   * GET /admin/system-actions/:id
   */
  getSystemAction: async (actionId: string): Promise<SystemAction> => {
    const response = await adminClient.get(`${ADMIN_BASE}/system-actions/${actionId}`);
    return response.data;
  },

  /**
   * Obtener una acción por su clave
   * GET /admin/system-actions/key/:actionKey
   */
  getSystemActionByKey: async (actionKey: string): Promise<SystemAction> => {
    const response = await adminClient.get(`${ADMIN_BASE}/system-actions/key/${actionKey}`);
    return response.data;
  },

  /**
   * Crear una nueva acción del sistema
   * POST /admin/system-actions
   */
  createSystemAction: async (data: CreateSystemActionDto): Promise<SystemAction> => {
    const response = await adminClient.post(`${ADMIN_BASE}/system-actions`, data);
    return response.data;
  },

  /**
   * Actualizar una acción
   * PATCH /admin/system-actions/:id
   */
  updateSystemAction: async (
    actionId: string,
    data: UpdateSystemActionDto
  ): Promise<SystemAction> => {
    const response = await adminClient.patch(
      `${ADMIN_BASE}/system-actions/${actionId}`,
      data
    );
    return response.data;
  },

  /**
   * Eliminar una acción
   * DELETE /admin/system-actions/:id
   */
  deleteSystemAction: async (actionId: string): Promise<void> => {
    await adminClient.delete(`${ADMIN_BASE}/system-actions/${actionId}`);
  },

  // ===== CATALOGS =====

  /**
   * Listar catálogos disponibles
   * GET /admin/catalogs
   */
  getAvailableCatalogs: async (): Promise<string[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/catalogs`);
    return response.data;
  },

  /**
   * Listar registros de un catálogo
   * GET /admin/catalogs/:table
   */
  getCatalogItems: async (
    table: string,
    activeOnly = true
  ): Promise<CatalogItem[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/catalogs/${table}`, {
      params: activeOnly ? { active: 'true' } : undefined,
    });
    return response.data;
  },

  /**
   * Obtener un registro de catálogo por ID
   * GET /admin/catalogs/:table/:id
   */
  getCatalogItem: async (
    table: string,
    id: string | number
  ): Promise<CatalogItem> => {
    const response = await adminClient.get(`${ADMIN_BASE}/catalogs/${table}/${id}`);
    return response.data;
  },

  /**
   * Crear un registro en el catálogo
   * POST /admin/catalogs/:table
   */
  createCatalogItem: async (
    table: string,
    data: Record<string, any>
  ): Promise<CatalogItem> => {
    const response = await adminClient.post(`${ADMIN_BASE}/catalogs/${table}`, data);
    return response.data;
  },

  /**
   * Actualizar un registro del catálogo
   * PATCH /admin/catalogs/:table/:id
   */
  updateCatalogItem: async (
    table: string,
    id: string | number,
    data: Record<string, any>
  ): Promise<CatalogItem> => {
    const response = await adminClient.patch(
      `${ADMIN_BASE}/catalogs/${table}/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Eliminar un registro del catálogo
   * DELETE /admin/catalogs/:table/:id
   */
  deleteCatalogItem: async (table: string, id: string | number): Promise<void> => {
    await adminClient.delete(`${ADMIN_BASE}/catalogs/${table}/${id}`);
  },

  /**
   * Listar departamentos por país
   * GET /admin/catalogs/departments/by-country/:countryId
   */
  getDepartmentsByCountry: async (countryId: string): Promise<Department[]> => {
    const response = await adminClient.get(
      `${ADMIN_BASE}/catalogs/departments/by-country/${countryId}`
    );
    return response.data;
  },

  /**
   * Listar municipios por departamento
   * GET /admin/catalogs/municipalities/by-department/:departmentId
   */
  getMunicipalitiesByDepartment: async (
    departmentId: string
  ): Promise<Municipality[]> => {
    const response = await adminClient.get(
      `${ADMIN_BASE}/catalogs/municipalities/by-department/${departmentId}`
    );
    return response.data;
  },

  // ===== USERS =====

  createUser: async (data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) => {
    const response = await adminClient.post(`${ADMIN_BASE}/users`, data);
    return response.data;
  },

  updateUserStatus: async (userId: string, status: 'active' | 'inactive') => {
    const response = await adminClient.patch(`${ADMIN_BASE}/users/${userId}/status`, { status });
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await adminClient.delete(`${ADMIN_BASE}/users/${userId}`);
    return response.data;
  },

  // ===== SITE SETTINGS =====

  getSiteSettings: async (): Promise<{ key: string; value: string | null; description: string | null }[]> => {
    const response = await adminClient.get(`${ADMIN_BASE}/site-settings`);
    return response.data;
  },

  updateSiteSetting: async (key: string, value: string | null) => {
    const response = await adminClient.put(`${ADMIN_BASE}/site-settings/${key}`, { value });
    return response.data;
  },

  uploadFavicon: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'site_asset');
    const response = await mediaClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const url = response.data.url;
    await adminClient.put(`${ADMIN_BASE}/site-settings/favicon_url`, { value: url });
    return { url };
  },

  uploadOgImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'site_asset');
    const response = await mediaClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const url = response.data.url;
    await adminClient.put(`${ADMIN_BASE}/site-settings/og_image_url`, { value: url });
    return { url };
  },
};

export default adminService;
