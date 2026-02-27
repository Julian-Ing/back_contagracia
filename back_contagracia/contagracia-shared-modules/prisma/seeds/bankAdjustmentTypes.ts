/**
 * Tipos de Ajuste Bancario - Conciliación Bancaria
 * Cada tipo tiene una cuenta contable por defecto del PUC
 */
export const bankAdjustmentTypes = [
  // Egresos (OUT)
  { name: 'Gastos bancarios', direction: 'OUT', account_code: '530506' },
  { name: 'Comisiones bancarias', direction: 'OUT', account_code: '530515' },
  { name: 'Intereses pagados', direction: 'OUT', account_code: '530520' },
  { name: 'Diferencia en cambio (egreso)', direction: 'OUT', account_code: '530525' },
  { name: 'Descuentos comerciales', direction: 'OUT', account_code: '530535' },
  { name: 'Manejo y emision de tarjetas', direction: 'OUT', account_code: '530540' },
  { name: 'GMF (4x1000)', direction: 'OUT', account_code: '530545' },
  { name: 'Chequeras', direction: 'OUT', account_code: '530555' },
  { name: 'Multas y sanciones', direction: 'OUT', account_code: '530560' },
  // Ingresos (IN)
  { name: 'Intereses recibidos', direction: 'IN', account_code: '421005' },
  { name: 'Reajuste monetario', direction: 'IN', account_code: '421010' },
  { name: 'Descuentos amortizados', direction: 'IN', account_code: '421015' },
  { name: 'Diferencia en cambio (ingreso)', direction: 'IN', account_code: '421020' },
  { name: 'Rendimientos', direction: 'IN', account_code: '421025' },
];
