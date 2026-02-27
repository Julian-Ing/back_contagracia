# Centro de Costos en Saldo Inicial de Cuentas Bancarias

**Fecha:** 2026-02-24

## Resumen

Se agrega soporte de centro de costos (CC) al flujo de creación de cuentas bancarias con saldo inicial. Los módulos de contabilidad y centros de costos son **independientes** — una compañía puede tener CC sin contabilidad y viceversa.

## Cambios

### `accounting-service/src/modules/bank-accounts/bank-accounts.service.ts`

**DTO:**
- `CreateBankAccountDto`: nuevo campo `cost_center_id?: string`

**Validación:**
- Si `hasCostCentersModule && initialBalance > 0`: requiere `cost_center_id` (independiente de contabilidad)

**Creación (dentro de `$transaction`):**
- CC movements son un bloque **separado e independiente** del bloque de contabilidad
- Si `hasCostCentersModule && dto.cost_center_id`:
  - Determina `ccMtKey` según tipo de cuenta: `cash_movement` (CASH) o `bank_movement` (SAVINGS/CHECKING)
  - Crea 2 CC movements (DEBIT + CREDIT)
  - `reference_type_key`: `'journal_entry'` si hay JE, `'bank_account_opening'` si no
  - `reference_id`: `je.id` si hay JE, `created.id` (bank account) si no
  - Si hay JE: vincula CC movements a JE items via `cost_center_movement_id`

### `create-payment-receipt-with-journal-entry.ts` — CC independiente de contabilidad

**Reestructuración mayor:**
- CC movements (paso 6) movidos **fuera** del bloque `if (hasAccounting)`
- Antes: CC estaba dentro del guard `if (!hasAccounting) return` → CC solo se creaba con contabilidad
- Ahora: contabilidad en `if (hasAccounting) { ... }`, CC en `if (hasCostCentersModule) { ... }` — completamente independientes
- `reference_type_key`: `'journal_entry'` si hay JE, `'payment_receipt'` (RECEIVABLE) o `'disbursement'` (PAYABLE) si no
- `reference_id`: `journalEntry.id` si hay JE, `receipt.id` si no
- Vinculación JE item ↔ CC movement solo cuando hay JE

### Nuevo tipo de referencia CC

**`contagracia-shared-modules/prisma/seeds/costCenterMovementReferenceTypes.ts`:**
- Agregado: `{ key: 'bank_account_opening', name: 'Saldo Inicial Banco/Caja' }`

## Frontend

### `front_contagracia/src/app/dashboard/banking/page.tsx`

- Importa `SearchableSelect`, `costCentersService`, `CostCenterTreeNode`
- `BankAccountForm`: nuevos campos `cost_center_id`, `cost_center_label`, `cost_center_path`
- `hasCCModule = hasModule('cost_centers')`
- `useEffect` carga árbol CC y flatMap cuando módulo activo
- Validación: si `hasInitialBalance && hasCCModule` → requiere `cost_center_id`
- Payload: envía `cost_center_id` cuando `hasCCModule && initialBalance > 0`
- UI: selector cascada CC (cascading selects por nivel) visible solo cuando `hasCCModule && hasInitialBalance`

## Principio de diseño

Los módulos `accounting` y `cost_centers` son **completamente independientes**:
- Contabilidad sin CC: JE items sin cost_center_id, sin CC movements
- CC sin contabilidad: CC movements con reference_type del documento (no 'journal_entry'), sin JE items
- Ambos activos: CC movements con reference_type 'journal_entry', vinculados a JE items
