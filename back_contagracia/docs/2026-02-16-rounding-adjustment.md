# Ajuste automatico por redondeo en pagos y anticipos

## Problema

Cuando `display_decimals` es menor que los decimales reales en BD (ej: BD guarda `10000.1234` pero UI muestra `10000.12`), el usuario ve un saldo redondeado y envia ese monto. Esto deja un saldo residual microscópico que nunca se puede pagar, y el documento queda en estado PARTIAL eternamente.

## Solucion

Se detecta automaticamente si el monto enviado por el usuario es el saldo redondeado del documento. Si es asi, se paga el saldo real completo y se genera una linea de ajuste por redondeo en el asiento contable.

## Flujo de deteccion

```
1. Leer displayDecimals desde CompanySetting (category: 'general', key: 'display_decimals')
2. Lock documento (ArAp o Prepayment) FOR UPDATE → obtener balance real
3. Si userAmount != currentBalance:
   a. roundedBalance = currentBalance.toFixed(displayDecimals)
   b. Si userAmount == roundedBalance → ES REDONDEO
      - actualPaymentAmount = currentBalance (el saldo REAL)
      - roundingDiff = userAmount - currentBalance
4. Si userAmount > currentBalance → error (excede saldo)
```

## Funciones modificadas

### `create-payment.ts`

- Nuevo param: `displayDecimals?: number`
- Nuevo retorno: `rounding_diff: number`, `actual_amount: number`
- Si detecta redondeo: paga el saldo real, no el redondeado
- El Payment se crea con `amount = actualPaymentAmount` (monto real)

### `create-prepayment-movement.ts`

- Mismo patron: `displayDecimals`, deteccion, `rounding_diff`, `actual_amount`
- El PrepaymentMovement se crea con `amount = actualMovementAmount` (monto real)

### `create-payment-receipt-with-journal-entry.ts`

- Lee `displayDecimals` del tenant al inicio
- Pasa `displayDecimals` a cada `createPayment()` y `createPrepaymentMovement()`
- Acumula `docResults[]` y `prepResults[]` con `actual_amount` y `rounding_diff`
- Construye items del asiento contable con `actual_amount` (no el monto del usuario)
- Agrega lineas de ajuste por redondeo al final del asiento

### `journal-entries.service.ts` (asientos manuales con CXC_PAID/CXP_PAID/PREP_USED)

- Mismo patron: lee displayDecimals, lock FOR UPDATE, detecta redondeo
- Modifica `item.amount` al monto real antes de crear el asiento
- Acumula diffs y agrega lineas de ajuste al `dto.items`

## Lineas de ajuste por redondeo en el asiento contable

La clasificacion de ingreso vs gasto depende del tipo de cuenta:

| Tipo de cuenta | diff > 0 (usuario envio mas) | diff < 0 (usuario envio menos) |
|----------------|------------------------------|-------------------------------|
| **Asset** (CxC, Anticipo proveedor/empleado) | Ingreso | Gasto |
| **Liability** (CxP, Anticipo cliente) | Gasto | Ingreso |

### Cuentas contables (AccountingConfig)

| Key | Descripcion | Cuenta PUC |
|-----|-------------|------------|
| `finance_rounding_income` | Ingreso por ajuste de redondeo | `421095` (Otros ingresos financieros) |
| `finance_rounding_expense` | Gasto por ajuste de redondeo | `530595` (Otros gastos financieros) |

### Formato de la linea de ajuste

```ts
// Ingreso por redondeo
{ account_code: '421095', amount: totalRoundingIncome, type: 'CREDIT', description: 'Ajuste por redondeo en decimales' }

// Gasto por redondeo
{ account_code: '530595', amount: totalRoundingExpense, type: 'DEBIT', description: 'Ajuste por redondeo en decimales' }
```

## Mapeo receipt lines ↔ JE items (cambio)

Se simplifico el mapeo de receipt lines a JE items. Antes se hacia por campos (account_code + type + amount + ref), ahora se hace **por orden de creacion** (`orderBy: created_at asc`). Las lineas de ajuste por redondeo quedan al final del JE sin receipt line correspondiente.

## Ejemplo

```
display_decimals = 2
ArAp balance real = 10000.1234
ArAp balance redondeado (UI) = 10000.12
Usuario envia: 10000.12

Deteccion: 10000.12 == toFixed(10000.1234, 2) → SI es redondeo
Payment.amount = 10000.1234 (saldo real)
roundingDiff = 10000.12 - 10000.1234 = -0.0034

Es CxC (asset) y diff < 0 → Gasto
Linea de ajuste: DEBIT 530595 $0.0034
```

## Seeds nuevos

### seed-accounting-config.ts
- `finance_rounding_income` → cuenta `421095`
- `finance_rounding_expense` → cuenta `530595`

### seed-puc.ts
- `530595` — Otros gastos financieros (tipo EXPENSE, padre 5305)

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `functions/create-payment.ts` | displayDecimals, deteccion redondeo, rounding_diff, actual_amount |
| `functions/create-prepayment-movement.ts` | Mismo patron de redondeo |
| `functions/create-payment-receipt-with-journal-entry.ts` | Lee displayDecimals, pasa a funciones, acumula diffs, lineas de ajuste, mapeo por orden |
| `modules/journal-entries/journal-entries.service.ts` | Redondeo en asientos manuales con CXC_PAID/CXP_PAID/PREP_USED |
| `prisma/seeds/seed-accounting-config.ts` | Nuevas configs rounding_income/expense |
| `prisma/seeds/seed-puc.ts` | Nueva cuenta 530595 |
