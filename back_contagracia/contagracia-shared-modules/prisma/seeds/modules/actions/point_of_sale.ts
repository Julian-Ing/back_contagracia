import { ActionDef } from '../types';

// ===== MÓDULO 7: POINT_OF_SALE - POS (11 permisos) =====
export const point_of_saleActions: ActionDef[] = [
    { action_key: 'pos.access', action_name: 'Acceder al POS', description: 'Acceder al punto de venta' },
    { action_key: 'pos.sales.create', action_name: 'Realizar Venta', description: 'Procesar ventas en POS' },
    { action_key: 'pos.sales.view', action_name: 'Ver Ventas POS', description: 'Ver historial de ventas POS' },
    { action_key: 'pos.discounts.apply', action_name: 'Aplicar Descuentos', description: 'Aplicar descuentos en POS' },
    { action_key: 'pos.discounts.override', action_name: 'Descuento Especial', description: 'Descuento mayor al límite' },
    { action_key: 'pos.refunds.process', action_name: 'Procesar Devolución', description: 'Procesar devolución en POS' },
    { action_key: 'pos.void.transaction', action_name: 'Anular Transacción', description: 'Anular transacción en curso' },
    { action_key: 'pos.print.receipt', action_name: 'Imprimir Recibo', description: 'Imprimir recibo de venta' },
    { action_key: 'pos.reprint.receipt', action_name: 'Reimprimir Recibo', description: 'Reimprimir recibo anterior' },
    { action_key: 'pos.documents.view', action_name: 'Ver Documentos POS', description: 'Ver documentos equivalentes' },
    { action_key: 'pos.documents.create', action_name: 'Crear Doc Equivalente', description: 'Crear documento equivalente' },
  ];
