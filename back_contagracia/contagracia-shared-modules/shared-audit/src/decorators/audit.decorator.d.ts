export declare const AUDIT_KEY = "audit";
/**
 * Decorator para auditar acciones
 * @param actionKey - Clave de la acción (ej: 'invoice.created')
 * @param entityType - Tipo de entidad (ej: 'invoice')
 */
export declare const Audit: (actionKey: string, entityType?: string) => import("@nestjs/common").CustomDecorator<string>;
