import { ActionDef } from '../types';

// ===== MÓDULO 11: PURCHASE_ORDERS - Órdenes de Compra (11 permisos) =====
export const purchase_ordersActions: ActionDef[] = [
    { action_key: 'purchase_orders.view', action_name: 'Ver Órdenes', description: 'Ver órdenes de compra' },
    { action_key: 'purchase_orders.create', action_name: 'Crear Orden', description: 'Crear orden de compra' },
    { action_key: 'purchase_orders.edit', action_name: 'Editar Orden', description: 'Editar orden' },
    { action_key: 'purchase_orders.delete', action_name: 'Eliminar Orden', description: 'Eliminar orden' },
    { action_key: 'purchase_orders.approve', action_name: 'Aprobar Orden', description: 'Aprobar orden' },
    { action_key: 'purchase_orders.reject', action_name: 'Rechazar Orden', description: 'Rechazar orden' },
    { action_key: 'purchase_orders.cancel', action_name: 'Cancelar Orden', description: 'Cancelar orden' },
    { action_key: 'purchase_orders.send', action_name: 'Enviar a Proveedor', description: 'Enviar orden a proveedor' },
    { action_key: 'purchase_orders.receive', action_name: 'Registrar Recepción', description: 'Registrar recepción' },
    { action_key: 'purchase_orders.print', action_name: 'Imprimir Orden', description: 'Imprimir orden' },
    { action_key: 'purchase_orders.export', action_name: 'Exportar Órdenes', description: 'Exportar órdenes' },
  ];
