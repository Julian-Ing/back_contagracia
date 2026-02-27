import { ActionDef } from '../types';

// ===== MÓDULO 10: INVENTORY_MANAGEMENT - Almacenes (17 permisos) =====
export const inventory_managementActions: ActionDef[] = [
    { action_key: 'warehouses.view', action_name: 'Ver Almacenes', description: 'Ver almacenes/bodegas' },
    { action_key: 'warehouses.create', action_name: 'Crear Almacén', description: 'Crear almacén' },
    { action_key: 'warehouses.edit', action_name: 'Editar Almacén', description: 'Editar almacén' },
    { action_key: 'warehouses.delete', action_name: 'Eliminar Almacén', description: 'Eliminar almacén' },
    { action_key: 'warehouses.activate', action_name: 'Activar Almacén', description: 'Activar almacén' },
    { action_key: 'warehouses.deactivate', action_name: 'Desactivar Almacén', description: 'Desactivar almacén' },
    { action_key: 'warehouses.stock.view', action_name: 'Ver Stock por Almacén', description: 'Ver stock por almacén' },
    { action_key: 'warehouses.users.assign', action_name: 'Asignar Usuarios', description: 'Asignar usuarios a almacén' },
    { action_key: 'storages.view', action_name: 'Ver Ubicaciones', description: 'Ver ubicaciones' },
    { action_key: 'storages.create', action_name: 'Crear Bodega', description: 'Crear Bodega' },
    { action_key: 'storages.edit', action_name: 'Editar Bodega', description: 'Editar Bodega' },
    { action_key: 'storages.delete', action_name: 'Eliminar Bodega', description: 'Eliminar Bodega' },
    { action_key: 'transfers.view', action_name: 'Ver Transferencias', description: 'Ver transferencias' },
    { action_key: 'transfers.create', action_name: 'Crear Transferencia', description: 'Crear transferencia' },
    { action_key: 'transfers.approve', action_name: 'Aprobar Transferencia', description: 'Aprobar transferencia' },
    { action_key: 'transfers.reject', action_name: 'Rechazar Transferencia', description: 'Rechazar transferencia' },
    { action_key: 'transfers.print', action_name: 'Imprimir Transferencia', description: 'Imprimir transferencia' },
  ];
