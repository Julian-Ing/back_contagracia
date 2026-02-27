# DocumentPaymentsModal — Modal de Pagos del Documento

**Fecha:** 2026-02-25
**Módulo:** Facturación (`invoicing`)

---

## Resumen

Modal que permite configurar las líneas de pago de un documento (factura) cuando el tipo de pago es **Contado**. Soporta múltiples líneas con tres tipos: Banco, Caja y Anticipo.

## Archivos

| Acción    | Archivo                                                         |
| --------- | --------------------------------------------------------------- |
| Creado    | `src/modules/invoicing/components/DocumentPaymentsModal.tsx`    |
| Modificado| `src/modules/invoicing/index.ts` (barrel export)                |
| Modificado| `src/app/dashboard/invoices/new/page.tsx` (integración)         |
| Modificado| `docs/ROADMAP-invoicing.md` (progreso + nota futura)            |

## Interfaz DocumentPaymentLine

```typescript
interface DocumentPaymentLine {
  id: string;                              // crypto.randomUUID()
  lineType: 'bank' | 'cash' | 'prepayment';
  bank_account_id: string;
  bank_account_label: string;
  prepayment_id: string;
  prepayment_label: string;
  prepayment_max_amount: number;
  company_payment_method_id: string;
  company_payment_method_label: string;
  amount: string;                          // string para NumericInput
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
}
```

## Comportamiento

- **Agregar Banco/Caja:** Agrega fila vacía con `lineType` seteado. Recurso via `BankAccountSelect` con `filterType='bank'` o `filterType='cash'`.
- **Agregar Anticipo:** Abre `SelectPrepaymentModal` filtrado por `allowedTypes={['CLIENT']}` y `thirdPartyId`. Al seleccionar, pre-llena label, saldo y monto.
- **Medio de Pago:** `PaymentMethodSelect` requerido en cada línea.
- **Centro de Costos:** `CostCenterCascadeSelect` — solo visible si la empresa tiene el módulo `cost_centers` (via `useCompanyModules`). Almacena `cost_center_id`, `cost_center_label` y `cost_center_path`. El modal se ensancha a `max-w-5xl` cuando el módulo está activo.
- **Monto:** `NumericInput` (lee `displayDecimals` del context).
- **Eliminar:** Botón Trash2 por línea.
- **Footer:** Total documento, total pagos, diferencia (en rojo si existe).
- **Validaciones visuales:** Se muestra la diferencia pero NO se bloquea al usuario. El botón Confirmar siempre está habilitado.

## Portal Selects

Usa patrón estándar: `dialogContentRef` en `DialogContent`, pasado como `portalContainer` a `BankAccountSelect` y `PaymentMethodSelect` con `usePortal`.

## Integración en page.tsx

- Estado `paymentLines` + `paymentsModalOpen` solo cuando `paymentType === 'CASH'`
- Botón "Pagos" muestra total pagado (FormattedNumber) + cantidad de líneas (ej: `$500,000 — 2 líneas`)
- `documentTotal={0}` por ahora (se llenará cuando exista tabla de ítems)

## Nota futura

Si el usuario no paga el total completo en Contado, el documento se cambiará automáticamente a Crédito al guardar (generando CxC por la diferencia). Anotado en ROADMAP.
