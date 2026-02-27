import { ActionDef } from '../types';

// ===== MÓDULO 18: FIXED_ASSETS - Activos Fijos (13 permisos) =====
export const fixed_assetsActions: ActionDef[] = [
    { action_key: 'fixed_assets.view', action_name: 'Ver Activos Fijos', description: 'Ver activos fijos' },
    { action_key: 'fixed_assets.create', action_name: 'Crear Activo', description: 'Crear activo' },
    { action_key: 'fixed_assets.edit', action_name: 'Editar Activo', description: 'Editar activo' },
    { action_key: 'fixed_assets.view_detail', action_name: 'Ver Detalle Activo', description: 'Ver detalle activo' },
    { action_key: 'fixed_assets.upload_image', action_name: 'Subir Imagen', description: 'Subir imagen activo' },
    { action_key: 'fixed_assets.depreciation.calculate', action_name: 'Calcular Depreciación', description: 'Calcular depreciación' },
    { action_key: 'fixed_assets.depreciation.run', action_name: 'Ejecutar Depreciación', description: 'Ejecutar depreciación' },
    { action_key: 'fixed_assets.sell', action_name: 'Registrar Venta', description: 'Registrar venta activo' },
    { action_key: 'fixed_assets.dispose', action_name: 'Dar de Baja', description: 'Dar de baja activo' },
    { action_key: 'fixed_assets.adjust', action_name: 'Crear Ajuste', description: 'Crear ajuste activo' },
    { action_key: 'fixed_assets.history.view', action_name: 'Ver Historial', description: 'Ver historial activo' },
    { action_key: 'fixed_assets.export', action_name: 'Exportar Activos', description: 'Exportar activos' },
  ];
