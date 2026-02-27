import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

/**
 * Decorator para auditar acciones
 * @param actionKey - Clave de la acción (ej: 'invoice.created')
 * @param entityType - Tipo de entidad (ej: 'invoice')
 */
export const Audit = (actionKey: string, entityType?: string) =>
    SetMetadata(AUDIT_KEY, { actionKey, entityType });
