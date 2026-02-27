import { ActionDef } from '../types';

// ===== MÓDULO 13: EXPENSES - Gastos (25 permisos) =====
export const expensesActions: ActionDef[] = [
    { action_key: 'expenses.view', action_name: 'Ver Gastos', description: 'Ver gastos' },
    { action_key: 'expenses.create', action_name: 'Crear Gasto', description: 'Crear gasto' },
    { action_key: 'expenses.edit', action_name: 'Editar Gasto', description: 'Editar gasto' },
    { action_key: 'expenses.delete', action_name: 'Eliminar Gasto', description: 'Eliminar gasto en borrador' },
    { action_key: 'expenses.approve', action_name: 'Aprobar Gasto', description: 'Aprobar gasto' },
    { action_key: 'expenses.import', action_name: 'Importar Gastos', description: 'Importar gastos' },
    { action_key: 'expenses.export', action_name: 'Exportar Gastos', description: 'Exportar gastos' },
    { action_key: 'expenses.toggle_deductible', action_name: 'Marcar Deducible', description: 'Marcar deducible' },
    { action_key: 'expenses.bulk_toggle_deductible', action_name: 'Marcar Masivo Deducible', description: 'Marcar masivo deducible' },
    { action_key: 'expenses.view_detail', action_name: 'Ver Detalle Gasto', description: 'Ver detalle de gasto' },
    { action_key: 'expenses.attachments.upload', action_name: 'Subir Adjuntos', description: 'Subir adjuntos' },
    { action_key: 'expenses.attachments.delete', action_name: 'Eliminar Adjuntos', description: 'Eliminar adjuntos' },
    { action_key: 'expense_categories.view', action_name: 'Ver Categorías', description: 'Ver categorías gasto' },
    { action_key: 'expense_categories.create', action_name: 'Crear Categoría', description: 'Crear categoría' },
    { action_key: 'expense_categories.edit', action_name: 'Editar Categoría', description: 'Editar categoría' },
    { action_key: 'expense_categories.delete', action_name: 'Eliminar Categoría', description: 'Eliminar categoría' },
    { action_key: 'expenses.recurrent.view', action_name: 'Ver Gastos Recurrentes', description: 'Ver gastos recurrentes' },
    { action_key: 'expenses.recurrent.create', action_name: 'Crear Gasto Recurrente', description: 'Crear gasto recurrente' },
    { action_key: 'expenses.recurrent.edit', action_name: 'Editar Gasto Recurrente', description: 'Editar gasto recurrente' },
    { action_key: 'expenses.recurrent.delete', action_name: 'Eliminar Gasto Recurrente', description: 'Eliminar gasto recurrente' },
    { action_key: 'expenses.recurrent.execute', action_name: 'Ejecutar Recurrente', description: 'Ejecutar recurrente' },
    { action_key: 'expenses.recurrent.toggle', action_name: 'Activar/Desactivar', description: 'Activar/desactivar recurrente' },
    { action_key: 'expense_returns.view', action_name: 'Ver Devoluciones Gasto', description: 'Ver devoluciones gasto' },
    { action_key: 'expense_returns.create', action_name: 'Crear Devolución Gasto', description: 'Crear devolución gasto' },
  ];
