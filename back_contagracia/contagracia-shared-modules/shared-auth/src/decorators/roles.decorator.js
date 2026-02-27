"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Roles = void 0;
const common_1 = require("@nestjs/common");
/**
 * Decorator para especificar roles requeridos en un endpoint
 * @example
 * @Roles('admin', 'manager')
 * @Get('users')
 * async getUsers() {
 *   return this.usersService.findAll();
 * }
 */
const Roles = (...roles) => (0, common_1.SetMetadata)('roles', roles);
exports.Roles = Roles;
