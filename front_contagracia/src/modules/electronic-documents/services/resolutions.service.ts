import { electronicDocsClient } from '@/shared/services/api/apiClient';

export interface Resolution {
  id: string;
  type_document_id: string;
  prefix: string;
  resolution_number: string;
  resolution_date: string;
  technical_key?: string;
  range_from: number;
  range_to: number;
  last_external_consecutive: number;
  date_from: string;
  date_to: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  type_document: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateResolutionDto {
  type_document_id: string;
  prefix: string;
  resolution_number: string;
  resolution_date: string;
  technical_key?: string;
  range_from: number;
  range_to: number;
  last_external_consecutive?: number;
  date_from: string;
  date_to: string;
  is_active?: boolean;
}

export interface UpdateResolutionDto extends Partial<CreateResolutionDto> {}

class ResolutionsService {
  async getAll(search?: string, typeDocumentId?: string, isActive?: string): Promise<Resolution[]> {
    const params: any = {};

    if (search) params.search = search;
    if (typeDocumentId) params.type_document_id = typeDocumentId;
    if (isActive === 'active') params.is_active = 'true';
    if (isActive === 'inactive') params.is_active = 'false';

    const response = await electronicDocsClient.get('/resolutions', { params });
    return response.data.data;
  }

  async getOne(id: string): Promise<Resolution> {
    const response = await electronicDocsClient.get(`/resolutions/${id}`);
    return response.data;
  }

  async create(data: CreateResolutionDto): Promise<Resolution> {
    const response = await electronicDocsClient.post('/resolutions', data);
    return response.data;
  }

  async update(id: string, data: UpdateResolutionDto): Promise<Resolution> {
    const response = await electronicDocsClient.patch(`/resolutions/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<{ message: string }> {
    const response = await electronicDocsClient.delete(`/resolutions/${id}`);
    return response.data;
  }
}

export const resolutionsService = new ResolutionsService();
