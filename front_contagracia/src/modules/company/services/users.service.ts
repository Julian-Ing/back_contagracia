import { usersClient } from '@/shared/services/api/apiClient';
import type {
  TenantUsersResponse,
  TenantUser,
  CreateTenantUserDto,
  UpdateTenantUserDto,
  RolesResponse,
  Role,
  CreateRoleDto,
  AvailableActionsResponse,
  AvailableActionsParams,
} from '../types';

export interface UsersQueryParams {
  skip?: number;
  take?: number;
  search?: string;
  isActive?: boolean;
}

export const usersService = {
  /**
   * Listar usuarios del tenant
   */
  async getUsers(params?: UsersQueryParams): Promise<TenantUsersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', String(params.skip));
    if (params?.take !== undefined) queryParams.append('take', String(params.take));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));

    const query = queryParams.toString();
    const url = query ? `/users?${query}` : '/users';
    const response = await usersClient.get<TenantUsersResponse>(url);
    return response.data;
  },

  /**
   * Obtener usuario por ID
   */
  async getUser(id: string): Promise<TenantUser> {
    const response = await usersClient.get<TenantUser>(`/users/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo usuario
   */
  async createUser(data: CreateTenantUserDto): Promise<{ message: string; user: TenantUser }> {
    const response = await usersClient.post<{ message: string; user: TenantUser }>('/users', data);
    return response.data;
  },

  /**
   * Actualizar usuario
   */
  async updateUser(id: string, data: UpdateTenantUserDto): Promise<{ message: string; user: TenantUser }> {
    const response = await usersClient.patch<{ message: string; user: TenantUser }>(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Activar/Desactivar usuario
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<{ message: string }> {
    const response = await usersClient.patch<{ message: string }>(`/users/${id}/status`, { is_active: isActive });
    return response.data;
  },

  /**
   * Cambiar rol de usuario
   */
  async updateUserRole(id: string, roleId: string): Promise<{ message: string; role: { role_key: string; role_name: string } }> {
    const response = await usersClient.patch<{ message: string; role: { role_key: string; role_name: string } }>(`/users/${id}/role`, { role_id: roleId });
    return response.data;
  },

  /**
   * Listar roles disponibles
   */
  async getRoles(): Promise<RolesResponse> {
    const response = await usersClient.get<RolesResponse>('/roles');
    return response.data;
  },

  /**
   * Obtener rol por ID
   */
  async getRole(id: string): Promise<Role> {
    const response = await usersClient.get<Role>(`/roles/${id}`);
    return response.data;
  },

  /**
   * Crear nuevo rol
   */
  async createRole(data: CreateRoleDto): Promise<{ message: string; role: Role }> {
    const response = await usersClient.post<{ message: string; role: Role }>('/roles', data);
    return response.data;
  },

  /**
   * Actualizar rol existente
   */
  async updateRole(id: string, data: Partial<CreateRoleDto>): Promise<{ message: string; role: Role }> {
    const response = await usersClient.patch<{ message: string; role: Role }>(`/roles/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar rol
   */
  async deleteRole(id: string): Promise<{ message: string }> {
    const response = await usersClient.delete<{ message: string }>(`/roles/${id}`);
    return response.data;
  },

  /**
   * Obtener acciones disponibles del plan para asignar a roles (paginado)
   */
  async getAvailableActions(params?: AvailableActionsParams): Promise<AvailableActionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.module) queryParams.append('module', params.module);
    if (params?.actionKeys && params.actionKeys.length > 0) {
      queryParams.append('actionKeys', params.actionKeys.join(','));
    }

    const query = queryParams.toString();
    const url = query ? `/roles/available-actions?${query}` : '/roles/available-actions';
    const response = await usersClient.get<AvailableActionsResponse>(url);
    return response.data;
  },
};
