/**
 * Company Service - API calls for company-service microservice
 * Maneja todas las operaciones relacionadas con empresas
 */

import { companyClient } from '@/shared/services/api/apiClient';
import type {
  Company,
  RegisterCompanyDto,
  RegisterCompanyResponse,
  UpdateCompanyDto,
  UpdateCompanyInfoDto,
  UpdateLegalRepDto,
  UpdateContadorDto,
  UpdateRevisorFiscalDto,
  UpdateSettingsDto,
} from '@/modules/company/types';

/**
 * Servicio de empresas
 * Consume endpoints del company-service (puerto 3002)
 */
export const companyService = {
  /**
   * Registrar nueva empresa con administrador inicial
   * Endpoint público - no requiere autenticación
   * POST /companies/register
   */
  register: async (data: RegisterCompanyDto): Promise<RegisterCompanyResponse> => {
    try {
      const response = await companyClient.post<RegisterCompanyResponse>(
        '/companies/register',
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al registrar la empresa';
      throw new Error(message);
    }
  },

  /**
   * Obtener información de una empresa
   * GET /companies/:id
   */
  getCompany: async (companyId: string): Promise<Company> => {
    try {
      const response = await companyClient.get<Company>(`/companies/${companyId}`);
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al obtener información de la empresa';
      throw new Error(message);
    }
  },

  /**
   * Actualizar información de una empresa
   * Solo admin/owner de la empresa
   * PATCH /companies/:id
   */
  updateCompany: async (
    companyId: string,
    data: UpdateCompanyDto
  ): Promise<Company> => {
    try {
      const response = await companyClient.patch<Company>(
        `/companies/${companyId}`,
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al actualizar la empresa';
      throw new Error(message);
    }
  },

  /**
   * Actualizar información general de la empresa (NIT, razón social, etc.)
   * PATCH /companies/:id/info
   */
  updateCompanyInfo: async (
    companyId: string,
    data: UpdateCompanyInfoDto
  ): Promise<{ message: string }> => {
    try {
      const response = await companyClient.patch<{ message: string }>(
        `/companies/${companyId}/info`,
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al actualizar información general';
      throw new Error(message);
    }
  },

  /**
   * Actualizar representante legal de la empresa
   * PATCH /companies/:id/legal-representative
   */
  updateLegalRep: async (
    companyId: string,
    data: UpdateLegalRepDto
  ): Promise<{ message: string }> => {
    try {
      const response = await companyClient.patch<{ message: string }>(
        `/companies/${companyId}/legal-representative`,
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al actualizar representante legal';
      throw new Error(message);
    }
  },

  /**
   * Actualizar contador de la empresa
   * PATCH /companies/:id/contador
   */
  updateContador: async (
    companyId: string,
    data: UpdateContadorDto
  ): Promise<{ message: string }> => {
    try {
      const response = await companyClient.patch<{ message: string }>(
        `/companies/${companyId}/contador`,
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al actualizar el contador';
      throw new Error(message);
    }
  },

  /**
   * Actualizar revisor fiscal de la empresa
   * PATCH /companies/:id/revisor-fiscal
   */
  updateRevisorFiscal: async (
    companyId: string,
    data: UpdateRevisorFiscalDto
  ): Promise<{ message: string }> => {
    try {
      const response = await companyClient.patch<{ message: string }>(
        `/companies/${companyId}/revisor-fiscal`,
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al actualizar el revisor fiscal';
      throw new Error(message);
    }
  },

  /**
   * Actualizar configuración de decimales
   * PATCH /companies/:id/settings
   */
  updateSettings: async (
    companyId: string,
    data: UpdateSettingsDto
  ): Promise<{ message: string }> => {
    try {
      const response = await companyClient.patch<{ message: string }>(
        `/companies/${companyId}/settings`,
        data
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Error al actualizar configuración';
      throw new Error(message);
    }
  },
};

export default companyService;
