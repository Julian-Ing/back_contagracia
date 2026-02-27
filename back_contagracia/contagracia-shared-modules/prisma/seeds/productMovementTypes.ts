/**
 * Tipos de Movimiento de Inventario
 * Catálogo maestro de los tipos de movimiento de productos
 */
export const productMovementTypes = [
  { key: 'sale', name: 'Venta' },
  { key: 'sale_credit_note', name: 'Nota Crédito Venta' },
  { key: 'sale_debit_note', name: 'Nota Débito Venta' },
  { key: 'purchase', name: 'Compra' },
  { key: 'purchase_credit_note', name: 'Nota Crédito Compra' },
  { key: 'storage_transfer', name: 'Transferencia entre bodegas' },
  { key: 'product_transfer', name: 'Transferencia entre productos' },
  { key: 'adjustment', name: 'Ajuste manual' },
];
