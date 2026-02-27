# Anulacion y Edicion de Recibos de Caja / Comprobantes de Egreso

## Resumen

Se agrego la funcionalidad de anular y editar recibos de caja (RECEIVABLE) y comprobantes de egreso (PAYABLE) desde las paginas de CxC y CxP. Se reutiliza el componente `PaymentReceiptForm` en modos read-only (anulacion) y editable (edicion).

## PaymentReceiptForm — modos

### Props

```ts
interface PaymentReceiptFormProps {
  // ... props existentes
  receiptId?: string;
  mode?: 'create' | 'view' | 'reverse' | 'edit';  // default: 'create'
}
```

### Modos

| Modo | Titulo | Campos | Botones accion | Footer |
|------|--------|--------|----------------|--------|
| `create` | Nuevo Recibo/CE | Editables | Visibles | Crear |
| `view` | Recibo/CE + consecutivo | Disabled | Ocultos | Cerrar |
| `reverse` | Anular Recibo/CE | Disabled | Ocultos | Anular (rojo) + Cerrar |
| `edit` | Editar Recibo/CE | Editables | Visibles | Guardar Cambios + Cancelar |

### Comportamiento read-only (`view` / `reverse`)

- Header: DatePicker, ThirdPartySelect, Input descripcion → `disabled`
- Botones agregar linea (DOC, BANK, PREP_USED, ACCOUNT) → ocultos
- Tabla: toggle D/C oculto, montos con `<FormattedNumber>`, detalle como texto, boton eliminar oculto
- Totales con `<FormattedNumber>`

### Comportamiento edicion (`edit`)

- Carga datos existentes via `paymentReceiptsService.getOne(receiptId)`
- Campos editables (como create)
- Botones de agregar linea visibles
- Se pueden agregar, editar y eliminar lineas
- "Guardar Cambios" llama `paymentReceiptsService.edit(receiptId, payload)` que anula el recibo actual y crea uno nuevo en una sola transaccion

### Calculo de ref_max_amount en modo edit

Al cargar para edicion, el saldo disponible de cada documento/anticipo incluye lo que fue usado en el recibo original:

```
ref_max_amount = ref_current_balance + sum(montos de lineas con mismo ref_id en este recibo)
```

Ejemplo: si un ArAp tenia saldo 10000 y se pago completo (balance actual = 0), al editar: `0 + 10000 = 10000` disponible.

## effectiveMax — multiples lineas del mismo documento

Se permite agregar multiples lineas del mismo documento (por ejemplo, para pagar un doc con distintos metodos de pago). El maximo disponible se calcula descontando lo asignado en otras lineas:

```ts
effectiveMax(line) = ref_max_amount - sum(montos de OTRAS lineas con mismo ref_id)
```

Todas las comparaciones usan `Decimal` de decimal.js, nunca operadores nativos.

Se muestra hint "Max: $X" debajo del detalle de cada linea DOC/PREP_USED.

## Servicio

`src/modules/ar-ap/services/paymentReceipts.service.ts`

```ts
getOne(id: string): Promise<PaymentReceiptDetail>   // GET /payment-receipts/:id
edit(id: string, payload): Promise<any>              // PUT /payment-receipts/:id
reverse(id: string, reason?: string): Promise<any>   // POST /payment-receipts/:id/reverse
```

## Tipos

`src/modules/ar-ap/types.ts`

```ts
interface PaymentReceiptLineDetail {
  // ... campos existentes
  ref_current_balance: number | null;  // saldo actual en BD (para calculo edit)
}
```

## Integracion en paginas

### `accounts-receivable/page.tsx`

- Boton `Pencil` en recibos ACTIVE → abre `PaymentReceiptForm` con `mode="edit"` (requiere `payment_receipts.edit`)
- Boton `Ban` (rojo) en recibos ACTIVE → abre con `mode="reverse"` (requiere `payment_receipts.void`)

### `accounts-payable/page.tsx`

- Mismo comportamiento para tipo PAYABLE

## Permisos

| Accion | Permiso |
|--------|---------|
| Ver recibos | `payment_receipts.view` |
| Crear recibo | `payment_receipts.create` |
| Editar recibo | `payment_receipts.edit` |
| Anular recibo | `payment_receipts.void` |
| Imprimir recibo | `payment_receipts.print` |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `modules/ar-ap/components/PaymentReceiptForm.tsx` | Mode `edit`, effectiveMax, permitir docs duplicados, Decimal.js |
| `modules/ar-ap/services/paymentReceipts.service.ts` | Metodo `edit` |
| `modules/ar-ap/types.ts` | `ref_current_balance` en PaymentReceiptLineDetail |
| `accounts-receivable/page.tsx` | Boton editar + modal edit |
| `accounts-payable/page.tsx` | Boton editar + modal edit |
