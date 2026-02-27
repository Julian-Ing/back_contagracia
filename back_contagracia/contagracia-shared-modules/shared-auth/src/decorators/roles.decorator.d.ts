/**
 * Decorator para especificar roles requeridos en un endpoint
 * @example
 * @Roles('admin', 'manager')
 * @Get('users')
 * async getUsers() {
 *   return this.usersService.findAll();
 * }
 */
export declare const Roles: (...roles: string[]) => import("@nestjs/common").CustomDecorator<string>;
