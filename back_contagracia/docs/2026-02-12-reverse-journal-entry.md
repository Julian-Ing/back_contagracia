# Feature: funcion standalone reverseJournalEntry

**Fecha:** 2026-02-12

## Proposito

Funcion reutilizable para reversar un asiento contable. Extraida de `JournalEntriesService.reverse()` para poder ser usada desde:
- `JournalEntriesService.reverse()` (controller de asientos manuales)
- `PeriodsService.reopen()` (reapertura de periodos contables)
- `voidPrepayment` (anulacion de anticipos)
- Cualquier otra operacion que necesite reversar un asiento

## Logica

1. **Valida periodo contable** ANTES de tocar cualquier tabla
2. **FOR UPDATE** en `journal_entries` para lock y evitar doble reversion
3. Valida que el asiento exista y NO este ya reversado
4. Obtiene items con TODA la info: account_code, type, amount, description, third_party_id, bank_account_id, **reference_type**, **reference_id**
5. Marca original como `is_reversed = true`
6. Crea items invertidos: DEBIT→CREDIT, CREDIT→DEBIT (misma cuenta, monto, tercero, banco, tipo de linea, ref_id)
7. Descripcion incluye consecutivo del original: `"Reversion de {consecutive}: {description}"`
8. Crea asiento de reversion via `createJournalEntry` con `type_key: 'reversal'` y `reference_id: original.id`

## NO hace

- **NO toca bancos** — el caller crea movimientos bancarios inversos si aplica
- **NO toca CxC ni CxP** — el caller se encarga
- **NO crea ningun movimiento extra** — solo el asiento contable

## Parametros

```typescript
interface ReverseJournalEntryParams {
  journal_entry_id: string;
  reversal_date?: Date | null;  // null para reversion de period_close
}
```

## Retorno

```typescript
interface CreateJournalEntryResult {
  id: string;
  consecutive: string;
}
```

## Refactoring

- `JournalEntriesService.reverse()` ahora delega a esta funcion
- `PeriodsService.reopen()` puede migrar en el futuro

## Archivo
- `accounting-service/src/functions/reverse-journal-entry.ts`
