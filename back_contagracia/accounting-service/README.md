# Accounting Service

Microservicio de contabilidad de Contagracia ERP. Maneja asientos contables, periodos, CxC/CxP, anticipos, bancos y recibos de pago.

## Setup

```bash
pnpm install
pnpm run start:dev
```

## Arquitectura Transaccional (OBLIGATORIA)

**Todo proceso contable que realice multiples escrituras DEBE seguir el patron de transaccion unica.**

### Resumen

- **Funciones base** (`functions/`): Reciben `tx` (cliente de transaccion Prisma) como primer parametro. NUNCA crean su propia `$transaction`.
- **Servicios** (`modules/*/service.ts`): Crean UNA `$transaction` y pasan `tx` a todas las funciones base. Son los unicos que llaman `tenantDb.$transaction()`.

### Funciones base modificadas

| Funcion | Archivo |
|---------|---------|
| `createJournalEntry(tx, params)` | `functions/create-journal-entry.ts` |
| `createArAp(tx, params)` | `functions/create-ar-ap.ts` |
| `createBankMovement(tx, params)` | `functions/create-bank-movement.ts` |
| `createBankMovements(tx, movements)` | `functions/create-bank-movement.ts` |
| `reverseJournalEntry(tx, params)` | `functions/reverse-journal-entry.ts` |
| `reverseBankMovements(tx, params)` | `functions/reverse-bank-movements.ts` |
| `voidPaymentReceipt(tx, params)` | `functions/void-payment-receipt.ts` |
| `getNextConsecutive(tx, type)` | `functions/get-next-consecutive.ts` |
| `createPayment(tx, params)` | `functions/create-payment.ts` |
| `createPaymentReceipt(tx, params)` | `functions/create-payment-receipt.ts` |
| `createPrepaymentMovement(tx, params)` | `functions/create-prepayment-movement.ts` |
| `voidPayment(tx, params)` | `functions/void-payment.ts` |
| `voidPrepaymentMovement(tx, params)` | `functions/void-prepayment-movement.ts` |

### Servicios modificados

| Servicio | Metodos con `$transaction` |
|----------|---------------------------|
| `JournalEntriesService` | `create`, `reverse`, `reverseComplete`, `duplicate` |
| `PrepaymentsService` | `createPrepayment`, `voidPrepayment`, `refundPrepayment` |
| `PeriodsService` | `close`, `reopen`, `create` |
| `BankAccountsService` | `create` (cuando hay saldo inicial) |
| `BankMovementsService` | `create` |

### Ejemplo de uso correcto

```typescript
async miMetodo(companyId: string, dto: MiDto) {
  const tenantDb = await this.getTenantDb(companyId);

  // Lecturas pueden ir fuera de la transaccion
  await validatePeriodOpen(tenantDb, dto.date);

  // UNA transaccion para TODAS las escrituras
  return tenantDb.$transaction(async (tx: any) => {
    const arAp = await createArAp(tx, { ... });
    const entry = await createJournalEntry(tx, { ... });
    await createBankMovement(tx, { ... });
    // Si algo falla -> ROLLBACK automatico de TODO
    return entry;
  });
}
```

### Documentacion completa

Ver [docs/transaction-safety.md](docs/transaction-safety.md) para la guia completa con reglas, ejemplos y como agregar nuevos procesos.

## Modulos

- **journal-entries**: Asientos contables manuales y automaticos
- **periods**: Periodos contables, cierre y reapertura
- **ar-ap**: Cuentas por cobrar y pagar
- **prepayments**: Anticipos (clientes, proveedores, empleados)
- **bank-accounts**: Cuentas bancarias y cajas
- **bank-movements**: Movimientos bancarios
- **chart-of-accounts**: Plan unico de cuentas (PUC)
- **payment-receipts**: Recibos de pago
- **bank-reconciliation**: Conciliacion bancaria

## Documentacion adicional

- [Datos Dinamicos](docs/datos-dinamicos.md) - **Regla: no hardcodear labels que existen en BD**
- [Seguridad Transaccional](docs/transaction-safety.md) - **Patron obligatorio para todo codigo contable**
- [Asientos Contables](docs/journal-entries.md)
- [Cierre/Reapertura de Periodos](docs/period-closing-reopening.md)
- [Movimientos Bancarios](docs/create-bank-movement-function.md)
- [Plan de Cuentas](docs/CHART_OF_ACCOUNTS.md)
- [CxC/CxP](docs/2026-02-10-ar-ap-module-backend.md)
- [Recibos de Caja / Comprobantes de Egreso](docs/payment-receipts.md)
