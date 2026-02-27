"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoAudit = exports.NO_AUDIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.NO_AUDIT_KEY = 'no_audit';
/**
 * Decorador para excluir endpoints del audit logging
 * Útil para health checks, metrics, y otros endpoints ruidosos
 */
const NoAudit = () => (0, common_1.SetMetadata)(exports.NO_AUDIT_KEY, true);
exports.NoAudit = NoAudit;
