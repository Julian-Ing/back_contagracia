import { SetMetadata } from '@nestjs/common';

export const NO_AUDIT_KEY = 'no_audit';

/**
 * Decorador para excluir endpoints del audit logging
 * Útil para health checks, metrics, y otros endpoints ruidosos
 */
export const NoAudit = () => SetMetadata(NO_AUDIT_KEY, true);
