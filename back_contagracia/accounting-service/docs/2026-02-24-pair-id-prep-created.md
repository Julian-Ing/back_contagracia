# pair_id + PREP_CREATED en Asientos Manuales

**Fecha:** 2026-02-24

## Resumen

Se agregan dos capacidades nuevas a los asientos manuales:

1. **PREP_CREATED**: Crear anticipos (CLIENT, SUPPLIER, EMPLOYEE) desde una linea del asiento.
2. **pair_id**: Vincular lineas creadoras y consumidoras dentro del mismo asiento, permitiendo crear y pagar/usar un documento en una sola operacion.

## Cambios en Schema (Prisma)

### `JournalEntryItemRefType` (enum)
Nuevos valores:
- `PREP_CREATED_CLIENT` — Anticipo de cliente creado
- `PREP_CREATED_SUPPLIER` — Anticipo de proveedor creado
- `PREP_CREATED_EMPLOYEE` — Anticipo de empleado creado

### `PaymentReceiptLineKind` (enum)
Nuevo valor:
- `PREP_CREATED` — Anticipo creado

## Cambios en Backend

### `create-journal-entry.ts`
- Se agrego `pair_id?: string` a `JournalEntryItemInput` (campo efimero, NO se almacena en DB).

### `journal-entries.controller.ts`
- Se agrego `pair_id?: string` al DTO de items.

### `journal-entries.service.ts` — `create()`

#### Pre-validacion

1. **PREP_CREATED validation** (3d): Valida que las lineas PREP_CREATED_* tengan tercero y tipo de linea correcto:
   - `PREP_CREATED_CLIENT` solo en lineas CREDIT
   - `PREP_CREATED_SUPPLIER` / `PREP_CREATED_EMPLOYEE` solo en lineas DEBIT

2. **pair_id validation** (3e): Valida grupos de pair_id:
   - Un consumidor con pair_id DEBE tener un creador en el mismo grupo
   - No puede haber multiples creadores con el mismo pair_id
   - Total consumido no puede exceder monto creado
   - Compatibilidad: CXC_CREATED<->CXC_PAID, CXP_CREATED<->CXP_PAID, PREP_CREATED_*<->PREP_USED
   - Terceros deben coincidir entre creador y consumidores

3. **Skip validation para pair_id**: Los items CXC_PAID/CXP_PAID/PREP_USED con pair_id saltan la validacion de reference_id y documento externo (se resuelven en la transaccion).

#### Transaccion

Orden final:

1. Crear ArAps (CXC_CREATED, CXP_CREATED) -> `pairIdMap`
2. **Crear Prepayments (PREP_CREATED_*)** -> `pairIdMap` (NUEVO)
3. **Resolver pair_id en consumidores** — inyectar reference_id (NUEVO)
4. Rounding pre-computation
5. Crear Journal Entry
6. Actualizar ArAps con JE link
7. **Actualizar Prepayments con JE link** (NUEVO)
8. Bank movements
9. CC movements
10. Payment receipt + Payments + PrepaymentMovements

#### Creacion de Prepayments

Para cada item PREP_CREATED_*:
- Determina tipo: CLIENT, SUPPLIER, EMPLOYEE
- Genera consecutivo via `getNextConsecutive(tx, 'prepayment')`
- Crea registro `Prepayment` con balance = amount, status = ACTIVE
- Inyecta `reference_id = prepayment.id` en el item
- Si tiene pair_id, lo registra en `pairIdMap`

#### Resolucion de pair_id

Despues de crear todas las entidades (ArAp + Prepayment):
- Itera todos los items consumidores con pair_id
- Busca el entity ID en `pairIdMap`
- Inyecta `reference_id` en el consumidor
- Si no se encuentra -> BadRequestException

#### PaymentReceipt kinds

Mapeo de `reference_type` a `kind` en lineas del PaymentReceipt:
- `PREP_CREATED_CLIENT/SUPPLIER/EMPLOYEE` -> `PREP_CREATED`

## Ejemplo de uso (saldos iniciales)

```
DEBIT  1305 (CXC) $1,000 -> CXC_CREATED, pair_id=abc123
CREDIT 1305 (CXC) $500   -> CXC_PAID, pair_id=abc123 (vinculado)
CREDIT 3605 (Equity) $500 -> NORMAL
```

Resultado: CXC creada con balance $500 (original $1,000 - pago $500).

## Notas

- `pair_id` es efimero — solo vive en el payload del request y en el state del frontend. NO se almacena en DB.
- NO se modifica `createJournalEntry()` de shared-modules.
- Un creador con pair_id PUEDE existir sin consumidores (crea el documento normalmente).
- Un consumidor con pair_id SIN creador es un error.
