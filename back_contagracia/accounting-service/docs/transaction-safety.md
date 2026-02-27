# Seguridad Transaccional - Patrón Obligatorio

## Regla Fundamental

**TODO proceso contable que realice multiples escrituras DEBE ejecutarlas dentro de UNA SOLA transaccion Prisma (`$transaction`).** Si cualquier operacion falla, TODAS se revierten automaticamente. No puede quedar data huerfana.

## Problema que resuelve

Antes, cada funcion base creaba su propia `$transaction` interna. Ejemplo:

```
Service.create() {
  await createArAp(tenantContext, companyId, ...);     // $transaction interna -> COMMIT
  await createJournalEntry(tenantContext, companyId, ...); // $transaction interna -> FALLA!
  // createArAp ya hizo commit -> CxC huerfana sin asiento contable
}
```

Ahora:

```
Service.create() {
  await tenantDb.$transaction(async (tx) => {
    await createArAp(tx, ...);          // usa tx del caller
    await createJournalEntry(tx, ...);  // usa tx del caller
    // Si CUALQUIERA falla -> ROLLBACK de TODO
  });
}
```

## Arquitectura

### Funciones Base (reciben `tx`)

Estas funciones son las piezas atomicas. **Nunca** crean su propia `$transaction`. Reciben el cliente de transaccion `tx` como primer parametro:

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `createJournalEntry(tx, params)` | `functions/create-journal-entry.ts` | Crea asiento contable con items |
| `createArAp(tx, params)` | `functions/create-ar-ap.ts` | Crea documento CxC o CxP |
| `createBankMovement(tx, params)` | `functions/create-bank-movement.ts` | Crea movimiento bancario (con FOR UPDATE lock) |
| `createBankMovements(tx, movements)` | `functions/create-bank-movement.ts` | Crea multiples movimientos bancarios |
| `reverseJournalEntry(tx, params)` | `functions/reverse-journal-entry.ts` | Reversa un asiento contable |
| `reverseBankMovements(tx, params)` | `functions/reverse-bank-movements.ts` | Reversa movimientos bancarios |
| `voidPaymentReceipt(tx, params)` | `functions/void-payment-receipt.ts` | Anula recibo de pago completo |
| `getNextConsecutive(tx, type)` | `functions/get-next-consecutive.ts` | Genera consecutivo atomico |
| `createPayment(tx, params)` | `functions/create-payment.ts` | Crea pago individual |
| `createPaymentReceipt(tx, params)` | `functions/create-payment-receipt.ts` | Crea recibo de pago |
| `createPrepaymentMovement(tx, params)` | `functions/create-prepayment-movement.ts` | Crea movimiento de anticipo |
| `voidPayment(tx, params)` | `functions/void-payment.ts` | Anula un pago |
| `voidPrepaymentMovement(tx, params)` | `functions/void-prepayment-movement.ts` | Anula movimiento de anticipo |

### Funciones de Solo Lectura (compatibles con `tx`)

Estas funciones reciben un cliente Prisma (puede ser `tenantDb` o `tx`):

| Funcion | Archivo |
|---------|---------|
| `validatePeriodOpen(db, date)` | `functions/validate-period-open.ts` |
| `isPeriodOpen(db, date)` | `functions/is-period-open.ts` |
| `getAccountBalance(db, params)` | `functions/get-account-balance.ts` |
| `getClosingBalances(db, params)` | `functions/get-closing-balances.ts` |

### Servicios (crean la `$transaction`)

Los servicios son los unicos que llaman `tenantDb.$transaction()`. Dentro de la transaccion llaman a las funciones base pasando `tx`:

| Servicio | Metodos transaccionales |
|----------|------------------------|
| `JournalEntriesService` | `create`, `reverse`, `reverseComplete`, `duplicate` |
| `PrepaymentsService` | `createPrepayment`, `voidPrepayment`, `refundPrepayment` |
| `PeriodsService` | `close`, `reopen`, `create` |
| `BankAccountsService` | `create` (con saldo inicial) |
| `BankMovementsService` | `create` |

## Como agregar un nuevo proceso contable

### 1. Si necesitas una nueva funcion base

```typescript
// functions/mi-nueva-funcion.ts
export async function miNuevaFuncion(
  tx: any,           // SIEMPRE tx como primer parametro
  params: MiParams,
): Promise<MiResult> {
  // Validaciones usando tx
  const algo = await tx.miTabla.findUnique({ ... });
  if (!algo) throw new BadRequestException('...');

  // Operaciones usando tx
  const result = await tx.miTabla.create({ ... });

  // Puede llamar a otras funciones base pasando el mismo tx
  await createJournalEntry(tx, { ... });

  return result;
}
```

### 2. En el servicio

```typescript
// mi-servicio.service.ts
async miMetodo(companyId: string, dto: MiDto) {
  const tenantDb = await this.getTenantDb(companyId);

  // Lecturas FUERA de la transaccion (si no dependen de escrituras)
  const datosLectura = await tenantDb.tabla.findMany({ ... });

  // UNA SOLA transaccion para TODAS las escrituras
  const result = await tenantDb.$transaction(async (tx: any) => {
    // Todas las funciones base reciben tx
    const entry = await createJournalEntry(tx, { ... });
    const arAp = await createArAp(tx, { ... });
    const movement = await createBankMovement(tx, { ... });

    // Operaciones directas tambien usan tx
    await tx.miTabla.update({ ... });

    return { entry, arAp };
  });

  return result;
}
```

## Reglas estrictas

1. **Las funciones base NUNCA crean `$transaction`** - reciben `tx` del caller
2. **Los servicios SIEMPRE envuelven las escrituras en `$transaction`** - son los unicos que llaman `tenantDb.$transaction()`
3. **NO anidar transacciones** - Prisma no soporta transacciones anidadas. Una funcion base que recibe `tx` no puede llamar `tx.$transaction()`
4. **Lecturas independientes pueden ir fuera** - Si una lectura no depende de escrituras previas, puede hacerse con `tenantDb` antes de la transaccion
5. **Lecturas que dependen de escrituras van dentro** - Si necesitas leer datos que acabas de escribir, usa `tx` dentro de la transaccion
6. **No agregar timeouts** a las transacciones a menos que sea estrictamente necesario
7. **FOR UPDATE locks funcionan con `tx`** - `tx.$queryRaw\`SELECT ... FOR UPDATE\`` funciona correctamente

## Ejemplo real: JournalEntriesService.create()

```typescript
async create(companyId, dto) {
  const tenantDb = await this.getTenantDb(companyId);

  // Validaciones de lectura FUERA de tx
  await validatePeriodOpen(tenantDb, dto.date);

  // UNA transaccion para TODO
  const result = await tenantDb.$transaction(async (tx: any) => {
    // 1. Crear CxC/CxP si aplica
    if (needsArAp) {
      await createArAp(tx, { ... });
    }

    // 2. Crear asiento contable
    const entry = await createJournalEntry(tx, { ... });

    // 3. Crear movimientos bancarios
    await createBankMovement(tx, { ... });

    // 4. Crear recibo de pago si aplica
    if (needsReceipt) {
      await createPaymentReceipt(tx, { ... });
      await createPayment(tx, { ... });
    }

    return entry;
    // Si CUALQUIER paso falla -> ROLLBACK automatico de TODO
  });

  return result;
}
```
