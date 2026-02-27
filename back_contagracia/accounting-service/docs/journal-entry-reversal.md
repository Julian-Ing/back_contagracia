# Reversal de Asientos Contables

## Descripcion

Sistema de reversion de asientos contables que funciona para todos los tipos de asiento.

## Endpoint

```
POST /journal-entries/:id/reverse
```

## Body

```typescript
{
  date?: string  // Fecha de reversion (YYYY-MM-DD), default: hoy
}
```

## Arquitectura

### Separacion de Responsabilidades

La reversion esta dividida en dos partes:

1. **`JournalEntriesService.reverse()`** - Crea el asiento de reversion
2. **`JournalEntriesService.createBankMovementsForReversal()`** - Crea movimientos bancarios

```typescript
// Controller llama ambos
async reverse(req, id, body) {
  const result = await this.journalEntriesService.reverse(companyId, id, reversalDate);
  await this.journalEntriesService.createBankMovementsForReversal(companyId, id, reversalDate, result);
  return result;
}
```

### Por que esta separacion?

Permite que otros servicios usen `reverse()` sin crear movimientos bancarios:

- `PeriodsService.reopen()` revierte asientos de cierre/apertura
- Estos asientos NO tienen movimientos bancarios asociados
- Solo llama `reverse()`, no `createBankMovementsForReversal()`

## Funcion reverse()

### Ubicacion

`accounting-service/src/modules/journal-entries/journal-entries.service.ts`

### Firma

```typescript
async reverse(
  companyId: string,
  id: string,
  reversalDate?: Date | null
): Promise<CreateJournalEntryResult>
```

### Proceso

1. Obtiene cliente de tenant
2. Inicia transaccion con **FOR UPDATE** para evitar doble reversion
3. Valida que el asiento exista
4. Valida que no este reversado (`is_reversed = false`)
5. Determina fecha de reversion:
   - Si se pasa fecha: usa esa fecha
   - Si no: usa la fecha del asiento original (puede ser null para `period_close`)
6. Obtiene items del asiento original
7. Marca asiento original como `is_reversed = true`
8. Crea items invertidos (DEBIT <-> CREDIT)
9. Crea asiento de reversion usando `createJournalEntry()` con:
   - `type_key: 'reversal'`
   - `reference_id`: ID del asiento original
   - `description`: "Reversion de [descripcion original]"

### Validaciones (via createJournalEntry)

- Periodo contable abierto (excepto para reversiones de `period_close`)
- Cuentas contables existen
- Asiento balanceado

## Funcion createBankMovementsForReversal()

### Ubicacion

`accounting-service/src/modules/journal-entries/journal-entries.service.ts`

### Firma

```typescript
async createBankMovementsForReversal(
  companyId: string,
  originalEntryId: string,
  reversalDate: Date,
  reversalEntry: CreateJournalEntryResult
): Promise<void>
```

### Proceso

1. Obtiene items del asiento **original** que tienen `bank_account_id`
2. Para cada item con cuenta bancaria:
   - Calcula monto original: DEBIT = +amount, CREDIT = -amount
   - Invierte el monto: `reversedAmount = -originalAmount`
   - Crea movimiento bancario referenciando el **asiento de reversion**

### Logica de Montos

| Tipo Original | Monto Original | Monto Reversion |
|---------------|----------------|-----------------|
| DEBIT         | +1000          | -1000 (egreso)  |
| CREDIT        | -1000          | +1000 (ingreso) |

## Respuesta

```typescript
{
  id: string,          // ID del asiento de reversion
  consecutive: string  // Consecutivo (ej: "JE-0015")
}
```

## Errores

| Codigo | Mensaje |
|--------|---------|
| 404    | Asiento contable no encontrado |
| 409    | El asiento ya fue reversado |

## Ejemplo de Uso

### Desde Controller (con movimientos bancarios)

```typescript
const reversalDate = body.date ? new Date(body.date) : new Date();
const result = await this.journalEntriesService.reverse(companyId, id, reversalDate);
await this.journalEntriesService.createBankMovementsForReversal(companyId, id, reversalDate, result);
return result;
```

### Desde PeriodsService (sin movimientos bancarios)

```typescript
// Reversion de period_close - sin fecha
const closingReversal = await this.journalEntriesService.reverse(
  companyId,
  closeAction.journal_entry_id,
  null,
);

// Reversion de opening_balance - con fecha
const openingReversal = await this.journalEntriesService.reverse(
  companyId,
  openAction.journal_entry_id,
  openingEntry.date,
);
```

## Permisos

| Permiso | Descripcion |
|---------|-------------|
| `journal_entries.reverse` | Reversar asiento desde endpoint |
