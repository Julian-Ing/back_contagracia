import { electronicDocsClient } from './apiClient';

export interface RutQueryResponse {
  success: boolean;
  message: string;
  data?: {
    business_name?: string;
    email?: string;
    address?: string;
    phone?: string;
  };
}

/**
 * Consultar RUT en la DIAN por número de identificación
 * Llama al backend (electronic-documents-service) que hace de proxy al API DIAN
 */
export const queryRut = async (nit: string): Promise<RutQueryResponse> => {
  const response = await electronicDocsClient.post<RutQueryResponse>('/dian/query-rut', {
    identification_number: nit,
  });
  return response.data;
};

export default electronicDocsClient;
