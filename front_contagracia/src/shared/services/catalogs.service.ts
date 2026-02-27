/**
 * Catalogs Service
 * Lee catálogos paramétricos desde tenant DB (company-service)
 * Countries se mantiene en admin-service (no replicado a tenant)
 */

import { companyClient, adminClient } from './api/client';

// Tipos base para catálogos
export interface CatalogItem {
  id: number | string;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface Country extends CatalogItem {
  iso_code?: string;
}

export interface Department extends CatalogItem {
  country_id: string;
}

export interface Municipality extends CatalogItem {
  department_id: number;
}

export interface TypeDocumentIdentification extends CatalogItem {
  code: string;
}

export interface TypeOrganization extends CatalogItem {
  code: string;
}

export interface TypeRegime extends CatalogItem {
  code: string;
}

export interface TypeLiability extends CatalogItem {
  code: string;
}

export interface Bank extends CatalogItem {
  code: string;
}

export interface PaymentMethod extends CatalogItem {
  code: string;
}

export interface TaxType extends CatalogItem {
  code: string;
}

export interface Tax extends CatalogItem {
  percentage: number;
  tax_type_id: number;
}

export interface ProductUnit extends CatalogItem {
  code: string;
}

// Nombres de catálogos disponibles en tenant (company-service)
export type CatalogName =
  | 'departments'
  | 'municipalities'
  | 'type-document-identifications'
  | 'type-organizations'
  | 'type-regimes'
  | 'type-liabilities'
  | 'banks'
  | 'payment-methods'
  | 'tax-types'
  | 'taxes'
  | 'product-units';

// Servicio de catálogos
export const catalogsService = {
  /**
   * Obtener lista de catálogos disponibles
   */
  getAvailableCatalogs: async (): Promise<string[]> => {
    const response = await companyClient.get('/catalogs');
    return response.data;
  },

  /**
   * Obtener todos los registros de un catálogo (tenant DB)
   */
  getAll: async <T = CatalogItem>(
    catalog: CatalogName,
    onlyActive = true
  ): Promise<T[]> => {
    const params = onlyActive ? { active: 'true' } : {};
    const response = await companyClient.get(`/catalogs/${catalog}`, { params });
    return response.data?.data ?? response.data;
  },

  /**
   * Obtener un registro por ID (tenant DB)
   */
  getById: async <T = CatalogItem>(
    catalog: CatalogName,
    id: number | string
  ): Promise<T> => {
    const response = await companyClient.get(`/catalogs/${catalog}/${id}`);
    return response.data;
  },

  // Métodos específicos para jerarquía geográfica

  /**
   * Obtener países
   */
  getCountries: async (onlyActive = true): Promise<Country[]> => {
    // Countries no está replicado a tenant — se lee de admin-service (master)
    const params = onlyActive ? { active: 'true' } : {};
    const response = await adminClient.get('/admin/catalogs/countries', { params });
    return response.data?.data ?? response.data;
  },

  /**
   * Obtener departamentos por país (tenant DB)
   */
  getDepartmentsByCountry: async (countryId: string): Promise<Department[]> => {
    const response = await companyClient.get(
      `/catalogs/departments/by-country/${countryId}`
    );
    return response.data;
  },

  /**
   * Obtener municipios por departamento (tenant DB)
   */
  getMunicipalitiesByDepartment: async (
    departmentId: number | string
  ): Promise<Municipality[]> => {
    const response = await companyClient.get(
      `/catalogs/municipalities/by-department/${departmentId}`
    );
    return response.data;
  },

  // Métodos específicos para otros catálogos

  /**
   * Tipos de documento de identificación
   */
  getDocumentTypes: async (): Promise<TypeDocumentIdentification[]> => {
    return catalogsService.getAll<TypeDocumentIdentification>('type-document-identifications');
  },

  /**
   * Tipos de organización
   */
  getOrganizationTypes: async (): Promise<TypeOrganization[]> => {
    return catalogsService.getAll<TypeOrganization>('type-organizations');
  },

  /**
   * Tipos de régimen
   */
  getRegimeTypes: async (): Promise<TypeRegime[]> => {
    return catalogsService.getAll<TypeRegime>('type-regimes');
  },

  /**
   * Tipos de responsabilidad fiscal
   */
  getLiabilityTypes: async (): Promise<TypeLiability[]> => {
    return catalogsService.getAll<TypeLiability>('type-liabilities');
  },

  /**
   * Bancos
   */
  getBanks: async (): Promise<Bank[]> => {
    return catalogsService.getAll<Bank>('banks');
  },

  /**
   * Métodos de pago
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    return catalogsService.getAll<PaymentMethod>('payment-methods');
  },

  /**
   * Tipos de impuesto
   */
  getTaxTypes: async (): Promise<TaxType[]> => {
    return catalogsService.getAll<TaxType>('tax-types');
  },

  /**
   * Impuestos
   */
  getTaxes: async (): Promise<Tax[]> => {
    return catalogsService.getAll<Tax>('taxes');
  },

  /**
   * Unidades de producto
   */
  getProductUnits: async (): Promise<ProductUnit[]> => {
    return catalogsService.getAll<ProductUnit>('product-units');
  },
};
