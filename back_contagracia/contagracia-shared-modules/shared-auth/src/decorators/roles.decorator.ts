import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para especificar roles requeridos en un endpoint
 * @example
 * @Roles('admin', 'manager')
 * @Get('users')
 * async getUsers() {
 *   return this.usersService.findAll();
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
