export declare const NO_AUDIT_KEY = "no_audit";
/**
 * Decorador para excluir endpoints del audit logging
 * Útil para health checks, metrics, y otros endpoints ruidosos
 */
export declare const NoAudit: () => import("@nestjs/common").CustomDecorator<string>;
