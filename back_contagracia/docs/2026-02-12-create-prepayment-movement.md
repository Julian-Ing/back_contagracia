# Feature: funcion centralizada createPrepaymentMovement

**Fecha:** 2026-02-12

## Proposito

Funcion reutilizable para crear movimientos de anticipo. Se invoca desde:
- `applyPrepayment` (aplicar anticipo contra documento CxC/CxP)
- `refundPrepayment` (devolucion total o parcial)
- `createPaymentReceipt` (linea PREP_USED en recibos de caja/comprobantes de egreso)

## Logica

1. **FOR UPDATE** en `prepayments` para lock del balance y evitar race conditions
2. Validar que el anticipo exista y este en estado `ACTIVE`
3. Validar que `amount > 0` y `amount <= balance`
4. `getNextConsecutive(tx, 'prepayment_movement')` **despues** de todas las validaciones
5. Crear `PrepaymentMovement` con consecutivo ATM-XXXX
6. Reducir `Prepayment.balance`
7. Si balance llega a 0 → `status = APPLIED`

## Parametros

```typescript
interface CreatePrepaymentMovementParams {
  prepayment_id: string;
  application_date: Date;
  amount: number;
  applied_to_source_key?: string;  // key de ArApSource
  applied_to_id?: string;          // ID del documento CxC/CxP
  applied_to_number?: string;      // consecutivo del doc
  journal_entry_id?: string;       // asiento contable asociado
  notes?: string;
}
```

## Retorno

```typescript
interface CreatePrepaymentMovementResult {
  id: string;
  consecutive: string;             // ATM-000001
  new_balance: number;
  prepayment_fully_applied: boolean;
}
```

## Importante

- Debe llamarse **dentro de una transaccion** (`$transaction`) ya que recibe `tx`
- El consecutivo `prepayment_movement` (prefijo ATM) ya existe en el seeder `consecutiveTypes.ts`

## Archivo
- `accounting-service/src/functions/create-prepayment-movement.ts`
