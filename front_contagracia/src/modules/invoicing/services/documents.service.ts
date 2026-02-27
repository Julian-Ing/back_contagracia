import { invoicingClient } from '@/shared/services/api/apiClient';
import { DocumentsFilters, DocumentsResponse, CreateDocumentPayload, CreateDocumentResponse, DocumentDetail } from '../types';

export interface TypeOperationOption {
  value: string;  // UUID
  label: string;  // "09 - AIU"
  code: string;   // "09"
}

export const documentsService = {
  async getAll(filters: DocumentsFilters = {}): Promise<DocumentsResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.docType) params.doc_type = filters.docType;
    if (filters.status) params.status = filters.status;
    if (filters.fromDate) params.from_date = filters.fromDate;
    if (filters.toDate) params.to_date = filters.toDate;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await invoicingClient.get<DocumentsResponse>('/documents', { params });
    return response.data;
  },

  async create(data: CreateDocumentPayload): Promise<CreateDocumentResponse> {
    const response = await invoicingClient.post<CreateDocumentResponse>('/documents', data);
    return response.data;
  },

  async getById(id: string): Promise<DocumentDetail> {
    const response = await invoicingClient.get<DocumentDetail>(`/documents/${id}`);
    return response.data;
  },

  async update(id: string, data: CreateDocumentPayload): Promise<CreateDocumentResponse> {
    const response = await invoicingClient.put<CreateDocumentResponse>(`/documents/${id}`, data);
    return response.data;
  },

  async deleteDraft(id: string): Promise<{ deleted: boolean }> {
    const response = await invoicingClient.delete<{ deleted: boolean }>(`/documents/${id}`);
    return response.data;
  },

  async getTypeOperations(): Promise<TypeOperationOption[]> {
    const response = await invoicingClient.get<TypeOperationOption[]>('/documents/catalogs/type-operations');
    return response.data;
  },
};
