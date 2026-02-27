import { ActionDef } from '../types';

// ===== MÓDULO 12: PURCHASES - Compras (11 permisos) =====
export const purchasesActions: ActionDef[] = [
    { action_key: 'purchases.view', action_name: 'Ver Compras', description: 'Ver compras' },
    { action_key: 'purchases.create', action_name: 'Registrar Compra', description: 'Registrar compra' },
    { action_key: 'purchases.edit', action_name: 'Editar Compra', description: 'Editar compra' },
    { action_key: 'purchases.delete', action_name: 'Eliminar Compra', description: 'Eliminar compra en borrador' },
    { action_key: 'purchases.import', action_name: 'Importar Compras', description: 'Importar compras' },
    { action_key: 'purchases.export', action_name: 'Exportar Compras', description: 'Exportar compras' },
    { action_key: 'purchases.toggle_deductible', action_name: 'Marcar Deducible', description: 'Marcar deducible/no deducible' },
    { action_key: 'purchases.view_detail', action_name: 'Ver Detalle Compra', description: 'Ver detalle de compra' },
    { action_key: 'purchase_returns.view', action_name: 'Ver Devoluciones', description: 'Ver devoluciones compra' },
    { action_key: 'purchase_returns.create', action_name: 'Crear Devolución', description: 'Crear devolución compra' },
    { action_key: 'purchase_returns.import', action_name: 'Importar Devoluciones', description: 'Importar devoluciones' },
  ];
