"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireAnyPermission = exports.RequirePermissions = void 0;
const common_1 = require("@nestjs/common");
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
const RequirePermissions = (...actions) => (0, common_1.SetMetadata)('required_permissions', actions);
exports.RequirePermissions = RequirePermissions;
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
const RequireAnyPermission = (...actions) => (0, common_1.SetMetadata)('required_any_permission', actions);
exports.RequireAnyPermission = RequireAnyPermission;
