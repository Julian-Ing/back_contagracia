# Centro de Costos por Línea en PaymentReceiptForm

**Fecha:** 2026-02-24

## Resumen

Se agrega soporte de centro de costos (CC) por línea en `PaymentReceiptForm` (recibos de caja y comprobantes de egreso). Solo se muestra si la compañía tiene el módulo `cost_centers` activo. Replica el patrón ya usado en el formulario de asientos manuales.

## Archivos modificados

### `src/modules/ar-ap/components/PaymentReceiptForm.tsx`

**Interface `ReceiptLine`** — 5 campos nuevos:
```typescript
cost_center_id: string;
cost_center_label: string;
cost_center_path: string[];
cost_center_movement_type_key: string;
cost_center_movement_type_label: string;
```

**Estado CC** (cargado en `useEffect` si `hasCCModule`):
- `ccTree` — árbol jerárquico de centros de costos
- `ccFlatMap` — mapa plano id→nodo para lookup O(1)
- `ccMovementTypeOptions` — opciones de tipo de movimiento

**Auto-set de movement type** en handlers de creación de línea:
- `handleDocSelected` → `cxc` (RECEIVABLE) / `cxp` (PAYABLE)
- `handleBankSelected` → `bank_movement` / `cash_movement` según `accountType`
- `handlePrepSelected` → `prepayment_customer` / `prepayment_supplier` / `prepayment_employee`
- `handleAddAccountLine` → vacío (usuario selecciona manualmente)

**Renderizado** — segunda `<TableRow>` inline debajo de cada línea:
- Cascading `SearchableSelect` por nivel del árbol CC (mismo patrón que asientos manuales)
- Movement type: label estático para DOC/BANK/PREP_USED, `SearchableSelect` para ACCOUNT
- En readOnly: muestra labels de CC y tipo de movimiento

**Validación** — si `hasCCModule`:
- Cada línea requiere `cost_center_id` y `cost_center_movement_type_key`

**Payload** — `handleSubmit` y `handleEdit`:
- Incluye `cost_center_id` y `cost_center_movement_type_key` solo si `hasCCModule`

**View/Edit** — `getOne` loader:
- Mapea `cost_center` y `cost_center_movement_type` del backend a los campos del estado local

### `src/modules/ar-ap/services/paymentReceipts.service.ts`
- `CreatePaymentReceiptLinePayload`: campos opcionales `cost_center_id?`, `cost_center_movement_type_key?`

### `src/modules/ar-ap/types.ts`
- `PaymentReceiptLineDetail`: campos `cost_center` y `cost_center_movement_type` (nullable)

## UI

- Fila CC aparece debajo de cada línea con fondo `bg-slate-50/80` (light) / `bg-slate-800/40` (dark)
- Prefijo "CC:" en texto pequeño
- Selects con altura compacta (`h-7 text-xs`)
- Sin módulo CC activo: formulario sin cambios visuales
