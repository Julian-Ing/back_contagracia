# Retenciones, Totales y Botones — Nueva Factura

**Fecha:** 2026-02-25
**Módulo:** Facturación (`invoicing`)

---

## Resumen

Retenciones se gestionan en un modal (`DocumentWithholdingsModal`), con resumen integrado en la sección de totales. Totales siguen la estructura del formulario viejo. Botones de acción sin API aún.

## Archivos

| Acción     | Archivo                                                              |
| ---------- | -------------------------------------------------------------------- |
| Creado     | `src/modules/invoicing/components/DocumentWithholdingsModal.tsx`     |
| Modificado | `src/modules/invoicing/index.ts` (barrel export)                    |
| Modificado | `src/app/dashboard/invoices/new/page.tsx`                            |
| Modificado | `docs/ROADMAP-invoicing.md` (progreso + detalle totales)             |

## DocumentWithholdingsModal

**Patrón:** Igual que `DocumentPaymentsModal` — estado vive en `page.tsx`, modal recibe `lines` + `onLinesChange`.

### Props

```typescript
interface DocumentWithholdingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: WithholdingLine[];
  onLinesChange: (lines: WithholdingLine[]) => void;
  subtotal: number;   // base para ReteFuente / ReteICA
  totalIVA: number;   // base para ReteIVA
}
```

### WithholdingLine interface

```typescript
interface WithholdingLine {
  id: string;
  withholding_id: string;
  name: string;
  rate: number;
  tax_type_id: number; // 5=ReteIVA, 6=ReteFuente, 7=ReteICA
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
}
```

### Dentro del modal

- `TaxSelect` con `isTax={false}` para agregar (filtra solo retenciones)
- Tabla: Retención | Tasa | **Base** (valor real FormattedNumber) | **Monto** (auto: base×tasa/100) | CC (condicional) | Eliminar
- Base: ReteIVA (tax_type_id=5) → `totalIVA`, ReteFuente (6) / ReteICA (7) → `subtotal`
- `CostCenterCascadeSelect` por línea si módulo `cost_centers` activo
- Footer: total retenciones
- Prevención de duplicados (mismo `withholding_id`)
- Parsing: label `"Nombre (tasa%)"` → `{ name, rate, tax_type_id }`
- Portal selects: `dialogContentRef` para CC dentro del dialog
- Modal se ensancha a `max-w-5xl` si módulo CC activo

### Fuera del modal (en totales de page.tsx)

- Fila clickeable "Retenciones (N)" con total en rojo → abre modal
- Resumen 1×1 debajo: cada retención con nombre, tasa y monto (texto rojo, indentado)

## Totales

Estructura (sigue layout del formulario viejo):

| #  | Línea                  | Estado      | Notas                                    |
| -- | ---------------------- | ----------- | ---------------------------------------- |
| 1  | Subtotal               | **Activa**  | Sum de ítems (actualmente $0)            |
| 2  | Descuento líneas (-)   | **Activa**  | Se muestra solo si > 0                   |
| 3  | Base gravable          | **Activa**  | Se muestra solo si hay descuentos        |
| 4  | Impuestos 1×1 (+)      | Comentada   | Cada impuesto de ítems (IVA19, INC...)   |
| 5  | Subtotal + Impuestos   | **Activa**  | subtotal + totalTaxes                    |
| 6  | Retenciones            | **Activa**  | Botón → modal + resumen 1×1             |
| 7  | **Total a pagar**      | **Activa**  | totalInvoice - totalWithholdings         |

- **Sin descuentos globales** — solo descuentos por línea de ítem
- Todos los valores usan `Decimal.js` y `FormattedNumber`

## Botones

| Botón            | Acción              | Estado actual |
| ---------------- | -------------------- | ------------- |
| Cancelar         | Navega a `/dashboard/invoices` | Funcional |
| Guardar Borrador | Guardará como DRAFT  | TODO: API call |
| Guardar          | Guardará como PENDING| TODO: API call |

## Schema relacionado

`DocumentWithholding` ahora tiene `cost_center_id` nullable FK a `CostCenter` (cambio en backend, documentado en `back_contagracia/docs/2026-02-25-document-payment-cost-center.md`).
