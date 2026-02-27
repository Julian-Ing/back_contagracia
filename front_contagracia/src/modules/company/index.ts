/**
 * Company Module - Exports
 */

// Services
export { companyService } from '@/modules/company/services/company.service';
export { usersService } from '@/modules/company/services/users.service';

// Hooks
export { useUsers, useRoles } from '@/modules/company/hooks/useUsers';

// Types
export type {
  Company,
  RegisterCompanyDto,
  RegisterCompanyResponse,
  UpdateCompanyDto,
  TenantUser,
  TenantUserRole,
  TenantUsersResponse,
  CreateTenantUserDto,
  UpdateTenantUserDto,
  Role,
  RolesResponse,
} from '@/modules/company/types';
