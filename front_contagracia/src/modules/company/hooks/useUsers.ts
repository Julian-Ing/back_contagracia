import { useState, useEffect, useCallback } from 'react';
import { usersService, type UsersQueryParams } from '../services/users.service';
import type {
  TenantUser,
  Role,
  CreateTenantUserDto,
  UpdateTenantUserDto,
  CreateRoleDto,
  PlanAction,
  PlanModuleOption,
} from '../types';
import { useDebounce, useRealtimeList } from '@/shared/hooks';

export function useUsers(initialParams?: UsersQueryParams) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [total, setTotal] = useState(0);
  const [maxUsers, setMaxUsers] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<UsersQueryParams>(initialParams || { take: 20 });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersService.getUsers(params);
      setUsers(response.data);
      setTotal(response.total);
      setMaxUsers(response.maxUsers || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: CreateTenantUserDto) => {
    const result = await usersService.createUser(data);
    await fetchUsers();
    return result;
  };

  const updateUser = async (id: string, data: UpdateTenantUserDto) => {
    const result = await usersService.updateUser(id, data);
    await fetchUsers();
    return result;
  };

  const toggleUserStatus = async (id: string, isActive: boolean) => {
    const result = await usersService.updateUserStatus(id, isActive);
    await fetchUsers();
    return result;
  };

  const changeUserRole = async (id: string, roleId: string) => {
    const result = await usersService.updateUserRole(id, roleId);
    await fetchUsers();
    return result;
  };

  const search = (searchTerm: string) => {
    setParams((prev) => ({ ...prev, search: searchTerm, skip: 0 }));
  };

  const filterByStatus = (isActive?: boolean) => {
    setParams((prev) => ({ ...prev, isActive, skip: 0 }));
  };

  const paginate = (skip: number) => {
    setParams((prev) => ({ ...prev, skip }));
  };

  // Suscripción a eventos en tiempo real
  useRealtimeList('users:changed', useCallback(() => {
    fetchUsers();
  }, [fetchUsers]));

  return {
    users,
    total,
    maxUsers,
    loading,
    error,
    params,
    refetch: fetchUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    changeUserRole,
    search,
    filterByStatus,
    paginate,
  };
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersService.getRoles();
      setRoles(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (data: CreateRoleDto) => {
    const result = await usersService.createRole(data);
    await fetchRoles();
    return result;
  };

  const getRole = async (id: string) => {
    return usersService.getRole(id);
  };

  const updateRole = async (id: string, data: Partial<CreateRoleDto>) => {
    const result = await usersService.updateRole(id, data);
    await fetchRoles();
    return result;
  };

  const deleteRole = async (id: string) => {
    const result = await usersService.deleteRole(id);
    await fetchRoles();
    return result;
  };

  // Suscripción a eventos en tiempo real
  useRealtimeList('roles:changed', useCallback(() => {
    fetchRoles();
  }, [fetchRoles]));

  return {
    roles,
    loading,
    error,
    refetch: fetchRoles,
    createRole,
    getRole,
    updateRole,
    deleteRole,
  };
}

/**
 * Hook para obtener acciones disponibles del plan con paginación y búsqueda
 */
export function useAvailableActions(options?: { limit?: number; autoLoad?: boolean }) {
  const { limit = 50, autoLoad = false } = options || {};

  const [actions, setActions] = useState<PlanAction[]>([]);
  const [modules, setModules] = useState<PlanModuleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [page, setPage] = useState(1);
  const [filterActionKeys, setFilterActionKeys] = useState<string[] | undefined>(undefined);

  // Paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
  });

  // Debounce del search
  const debouncedSearch = useDebounce(search, 300);

  const fetchActions = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersService.getAvailableActions({
        page: pageNum,
        limit,
        search: debouncedSearch || undefined,
        module: selectedModule || undefined,
        actionKeys: filterActionKeys,
      });
      setActions(response.data);
      setModules(response.modules);
      setPagination(response.pagination);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar acciones');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedModule, limit, filterActionKeys]);

  // Cargar al cambiar filtros (con debounce del search)
  useEffect(() => {
    if (autoLoad || debouncedSearch || selectedModule || filterActionKeys) {
      fetchActions(1);
    }
  }, [debouncedSearch, selectedModule, autoLoad, filterActionKeys, fetchActions]);

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      fetchActions(pageNum);
    }
  };

  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);

  const reset = () => {
    setSearch('');
    setSelectedModule('');
    setPage(1);
    setActions([]);
    setPagination({ page: 1, limit, total: 0, totalPages: 0 });
  };

  return {
    actions,
    modules,
    loading,
    error,
    pagination,
    page,
    // Filtros
    search,
    setSearch,
    selectedModule,
    setSelectedModule,
    filterActionKeys,
    setFilterActionKeys,
    // Acciones
    fetchActions,
    goToPage,
    nextPage,
    prevPage,
    reset,
  };
}
