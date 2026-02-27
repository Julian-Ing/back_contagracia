# Formulario de Recibos de Caja / Comprobantes de Egreso

## Componente principal

`src/modules/ar-ap/components/PaymentReceiptForm.tsx`

Dialog reutilizable para crear Recibos de Caja (`RECEIVABLE`) y Comprobantes de Egreso (`PAYABLE`).

### Props

```ts
interface PaymentReceiptFormProps {
  open: boolean;
  onClose: () => void;
  type: 'RECEIVABLE' | 'PAYABLE';
  onSuccess?: () => void;
  initialThirdParty?: { id: string; name: string; document: string | null };
}
```

- `initialThirdParty`: Pre-llena el tercero al abrir. Se usa cuando se abre desde una fila especifica en las paginas de CxC/CxP.

### Estructura del formulario

**Header:** Fecha, Tercero (ThirdPartySelect), Descripcion opcional.

**Botones de accion:**
- Agregar Documento (DOC) — abre `SelectArApDocumentModal`
- Agregar Banco/Caja (BANK) — agrega linea con `BankAccountSelect`
- Agregar Anticipo (PREP_USED) — abre `SelectPrepaymentModal`
- Agregar Cuenta (ACCOUNT) — solo si `hasModule('accounting')`

**Tabla de lineas:** Tipo, Detalle, Cuenta (si accounting), Metodo de Pago (solo DOC), Debito, Credito, Eliminar.

**Totales + indicador de balance.**

### Tipos de linea y reglas debito/credito

| Kind | RECEIVABLE | PAYABLE |
|------|-----------|---------|
| DOC | Credit | Debit |
| BANK | Debit | Credit |
| PREP_USED | Segun tipo anticipo | Segun tipo anticipo |
| ACCOUNT | Toggle manual | Toggle manual |

**Logica PREP_USED D/C (funcion `getPrepSide`):**
- CLIENT → DEBIT (anticipo de cliente es pasivo, se debita para reducir)
- SUPPLIER → CREDIT (anticipo de proveedor es activo, se acredita para reducir)
- EMPLOYEE → CREDIT (anticipo de empleado es activo, se acredita para reducir)

### Filtrado de anticipos por tipo de recibo

`SelectPrepaymentModal` recibe `allowedTypes` para restringir los tipos visibles:
- RECEIVABLE → solo `['CLIENT']`
- PAYABLE → `['SUPPLIER', 'EMPLOYEE']`

Cuando `allowedTypes` tiene un solo tipo, el filtro se fija automaticamente y no se puede cambiar.

### Cadena de resolucion de cuentas contables

Cada tipo de linea resuelve su cuenta contable con fallbacks verificados del backend (`seed-accounting-config.ts`):

**DOC:**
1. `ar_ap.account_code`
2. `third_party.cxc_account_code` (RECEIVABLE) / `cxp_account_code` (PAYABLE)
3. `accountingConfig('finance_cxc')` / `accountingConfig('finance_cxp')`

**BANK:**
1. `bank_account.account_id`
2. `accountingConfig('finance_cash_account')` (CASH) / `accountingConfig('finance_bank_account')` (SAVINGS/CHECKING)

**PREP_USED:**
1. `prepayment.account_code`
2. `accountingConfig` segun tipo: CLIENT → `sales_customer_advance`, SUPPLIER → `purchases_supplier_advance`, EMPLOYEE → `accounting_employee_advance`

**ACCOUNT:** Seleccion manual con `AccountSelect`.

### Validaciones

- Tercero requerido
- Fecha requerida
- Minimo 2 lineas
- Debitos = Creditos (usa `Decimal` de decimal.js)
- Monto > 0 en cada linea
- Monto no excede saldo del documento/anticipo
- DOC requiere metodo de pago
- BANK requiere banco seleccionado
- ACCOUNT requiere cuenta contable

## Servicio

`src/modules/ar-ap/services/paymentReceipts.service.ts`

```ts
POST /payment-receipts
{
  type: 'RECEIVABLE' | 'PAYABLE',
  date: string,
  third_party_id: string,
  description?: string,
  lines: [{ kind, account_code, debit, credit, ref_id?, company_payment_method_id?, description? }]
}
```

### usePortal en selects dentro del dialog

Los selects dentro de la tabla de lineas usan `usePortal` para evitar que el dropdown quede cortado por el `overflow-y-auto` del `DialogContent`:

- `BankAccountSelect usePortal` — lineas tipo BANK
- `PaymentMethodSelect usePortal` — lineas tipo DOC
- `AccountSelect usePortal` — lineas tipo ACCOUNT

El `ThirdPartySelect` del header NO usa `usePortal` porque tiene espacio suficiente.

Los componentes `BankAccountSelect` y `PaymentMethodSelect` fueron actualizados para soportar `usePortal` siguiendo el mismo patron de `ThirdPartySelect`: `createPortal` + `fixed` positioning + `triggerRef` + listeners de scroll/resize.

## Modales reutilizados

Se importan directamente desde `journal-entries/new/`:

- `SelectArApDocumentModal` — con prop `initialThirdParty` para saltar paso 1
- `SelectPrepaymentModal` — con prop `terceroId` para filtrar por tercero, `allowedTypes` para restringir tipos

## Integracion en paginas

### `accounts-receivable/page.tsx`

- Boton header "Nuevo Recibo de Caja" → abre sin tercero pre-seleccionado
- Boton por fila (CreditCard) → abre con `initialThirdParty` del tercero de la fila
- `onSuccess` refresca summary + receipts

### `accounts-payable/page.tsx`

- Boton header "Nuevo Comprobante de Egreso" → abre sin tercero pre-seleccionado
- Boton por fila (CreditCard) → abre con `initialThirdParty` del tercero de la fila
- `onSuccess` refresca summary + receipts

## Archivos

| Archivo | Cambio |
|---------|--------|
| `modules/ar-ap/components/PaymentReceiptForm.tsx` | **NUEVO** — componente principal |
| `modules/ar-ap/services/paymentReceipts.service.ts` | **NUEVO** — servicio HTTP |
| `modules/ar-ap/index.ts` | Nuevos exports |
| `modules/ar-ap/types.ts` | `account_code` en ArApTransaction |
| `modules/ar-ap/services/prepayments.service.ts` | `third_party_id` en params |
| `journal-entries/new/SelectArApDocumentModal.tsx` | Prop `initialThirdParty` |
| `journal-entries/new/SelectPrepaymentModal.tsx` | Props `terceroId`, `allowedTypes` |
| `journal-entries/new/page.tsx` | Fix: auto-set D/C en PREP_USED segun tipo anticipo |
| `shared/components/ui/bank-account-select.tsx` | Soporte `usePortal` |
| `shared/components/ui/payment-method-select.tsx` | Soporte `usePortal` |
| `accounts-receivable/page.tsx` | Reemplaza placeholder por PaymentReceiptForm |
| `accounts-payable/page.tsx` | Reemplaza placeholder por PaymentReceiptForm |
