import { ActionDef } from '../types';

// ===== MÓDULO 15: AR_AP - Cuentas por Cobrar/Pagar (22 permisos) =====
export const ar_apActions: ActionDef[] = [
    { action_key: 'ar.view', action_name: 'Ver Cuentas x Cobrar', description: 'Ver cuentas por cobrar' },
    { action_key: 'ar.aging.view', action_name: 'Ver Antigüedad CxC', description: 'Ver antigüedad CxC' },
    { action_key: 'ar.payments.register', action_name: 'Registrar Cobro', description: 'Registrar cobro' },
    { action_key: 'ar.payments.view', action_name: 'Ver Pagos Recibidos', description: 'Ver pagos recibidos' },
    { action_key: 'ar.export', action_name: 'Exportar CxC', description: 'Exportar CxC' },
    { action_key: 'ap.view', action_name: 'Ver Cuentas x Pagar', description: 'Ver cuentas por pagar' },
    { action_key: 'ap.aging.view', action_name: 'Ver Antigüedad CxP', description: 'Ver antigüedad CxP' },
    { action_key: 'ap.payments.register', action_name: 'Registrar Pago', description: 'Registrar pago' },
    { action_key: 'ap.payments.view', action_name: 'Ver Pagos Realizados', description: 'Ver pagos realizados' },
    { action_key: 'ap.export', action_name: 'Exportar CxP', description: 'Exportar CxP' },
    { action_key: 'prepayments.view', action_name: 'Ver Anticipos', description: 'Ver anticipos' },
    { action_key: 'prepayments.create', action_name: 'Crear Anticipo', description: 'Crear anticipo' },
    { action_key: 'prepayments.edit', action_name: 'Editar Anticipo', description: 'Editar anticipo' },
    { action_key: 'prepayments.apply', action_name: 'Aplicar Anticipo', description: 'Aplicar anticipo' },
    { action_key: 'prepayments.void', action_name: 'Anular Anticipo', description: 'Anular anticipo' },
    { action_key: 'prepayments.refund', action_name: 'Reembolsar Anticipo', description: 'Reembolsar anticipo' },
    // Recibos de Caja (CxC - cobros)
    { action_key: 'cash_receipts.view', action_name: 'Ver Recibos de Caja', description: 'Ver recibos de caja' },
    { action_key: 'cash_receipts.create', action_name: 'Crear Recibo de Caja', description: 'Crear recibo de caja' },
    { action_key: 'cash_receipts.edit', action_name: 'Editar Recibo de Caja', description: 'Editar recibo de caja (anula y recrea)' },
    { action_key: 'cash_receipts.void', action_name: 'Anular Recibo de Caja', description: 'Anular recibo de caja' },
    { action_key: 'cash_receipts.print', action_name: 'Imprimir Recibo de Caja', description: 'Imprimir recibo de caja' },
    // Comprobantes de Egreso (CxP - pagos)
    { action_key: 'payment_vouchers.view', action_name: 'Ver Comprobantes de Egreso', description: 'Ver comprobantes de egreso' },
    { action_key: 'payment_vouchers.create', action_name: 'Crear Comprobante de Egreso', description: 'Crear comprobante de egreso' },
    { action_key: 'payment_vouchers.edit', action_name: 'Editar Comprobante de Egreso', description: 'Editar comprobante de egreso (anula y recrea)' },
    { action_key: 'payment_vouchers.void', action_name: 'Anular Comprobante de Egreso', description: 'Anular comprobante de egreso' },
    { action_key: 'payment_vouchers.print', action_name: 'Imprimir Comprobante de Egreso', description: 'Imprimir comprobante de egreso' },
    { action_key: 'cartera.reports.view', action_name: 'Ver Reportes Cartera', description: 'Ver reportes cartera' },
    { action_key: 'cartera.settings.edit', action_name: 'Configurar Cartera', description: 'Configurar cartera' },
    { action_key: 'payment_methods.view', action_name: 'Ver Métodos de Pago', description: 'Ver métodos de pago de la empresa' },
    { action_key: 'payment_methods.create', action_name: 'Crear Método de Pago', description: 'Crear método de pago personalizado' },
    { action_key: 'payment_methods.edit', action_name: 'Editar Método de Pago', description: 'Editar método de pago personalizado' },
    { action_key: 'payment_methods.delete', action_name: 'Eliminar Método de Pago', description: 'Eliminar método de pago personalizado' },
  ];
