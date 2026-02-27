"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Audit = exports.AUDIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.AUDIT_KEY = 'audit';
/**
 * Decorator para auditar acciones
 * @param actionKey - Clave de la acción (ej: 'invoice.created')
 * @param entityType - Tipo de entidad (ej: 'invoice')
 */
const Audit = (actionKey, entityType) => (0, common_1.SetMetadata)(exports.AUDIT_KEY, { actionKey, entityType });
exports.Audit = Audit;
