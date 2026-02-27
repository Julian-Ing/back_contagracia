/**
 * Eventos de Invoice
 */
export const InvoiceEvents = {
    CREATED: 'invoice.created',
    UPDATED: 'invoice.updated',
    DELETED: 'invoice.deleted',
    PAID: 'invoice.paid',
} as const;

/**
 * Eventos de Payment
 */
export const PaymentEvents = {
    RECEIVED: 'payment.received',
    FAILED: 'payment.failed',
    REFUNDED: 'payment.refunded',
} as const;

/**
 * Eventos de Notification
 */
export const NotificationEvents = {
    EMAIL_SENT: 'notification.email.sent',
    SMS_SENT: 'notification.sms.sent',
    WHATSAPP_SENT: 'notification.whatsapp.sent',
} as const;

/**
 * Eventos de Accounting
 */
export const AccountingEvents = {
    ENTRY_CREATED: 'accounting.entry.created',
    PERIOD_CLOSED: 'accounting.period.closed',
} as const;
