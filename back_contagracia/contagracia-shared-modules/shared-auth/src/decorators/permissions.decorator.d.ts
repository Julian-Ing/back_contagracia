/**
 * Decorator para especificar permisos requeridos (acciones) en un endpoint
 * Verifica que el usuario tenga TODAS las acciones especificadas
 *
 * @param actions - Lista de action_keys requeridos
 *
 * @example
 * @RequirePermissions('invoices.create', 'invoices.send')
 * @Post('invoices')
 * async createInvoice() {
 *   return this.invoicesService.create();
 * }
 */
export declare const RequirePermissions: (...actions: string[]) => import("@nestjs/common").CustomDecorator<string>;
/**
 * Decorator para requerir AL MENOS UNA de las acciones especificadas
 * Útil cuando hay múltiples formas de acceder a un recurso
 *
 * @param actions - Lista de action_keys (lógica OR)
 *
 * @example
 * @RequireAnyPermission('invoices.view', 'invoices.admin')
 * @Get('invoices')
 * async getInvoices() {
 *   return this.invoicesService.findAll();
 * }
 */
export declare const RequireAnyPermission: (...actions: string[]) => import("@nestjs/common").CustomDecorator<string>;
