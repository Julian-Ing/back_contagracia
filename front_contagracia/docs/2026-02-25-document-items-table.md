# Tabla de Ítems — Nueva Factura

**Fecha:** 2026-02-25
**Módulo:** Facturación (`invoicing`)

---

## Resumen

Tabla inline editable de ítems para el formulario de nueva factura. Soporta selección de productos, edición inline de cantidad/precio/descuento/impuesto, agrupación de variantes (expand/collapse), y columnas condicionales para bodega y centro de costos.

## Archivos

| Acción     | Archivo                                                              |
| ---------- | -------------------------------------------------------------------- |
| Creado     | `src/modules/invoicing/components/DocumentItemsTable.tsx`           |
| Modificado | `src/modules/invoicing/index.ts` (barrel export)                    |
| Modificado | `src/app/dashboard/invoices/new/page.tsx` (integración + totales)    |
| Modificado | `src/modules/inventory/services/products.service.ts` (tipo retorno) |
| Modificado | `docs/ROADMAP-invoicing.md` (progreso)                               |

### Backend

| Acción     | Archivo                                                                          |
| ---------- | -------------------------------------------------------------------------------- |
| Modificado | `inventory-service/src/modules/products/products.service.ts` (findForSelect)     |

## DocumentItemsTable

### Props

```typescript
interface DocumentItemsTableProps {
  items: ItemLine[];
  onItemsChange: (items: ItemLine[]) => void;
}
```

### ItemLine interface

```typescript
interface ItemLine {
  id: string;
  product_id: string;
  product_label: string;
  consecutive: string;
  barcode: string;
  parent_product_id: string | null;
  is_service: boolean;
  description: string;
  quantity: string;
  unit_price: string;
  is_discount_rate: boolean;
  discount_input: string;
  tax_id: string;
  tax_label: string;
  tax_rate: number;
  storage_id: string;
  storage_label: string;
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
}
```

### Búsqueda de ítems

Input "Buscar items..." aparece cuando hay al menos 1 ítem. Filtra las filas ya agregadas por `product_label`, `consecutive` y `barcode`. La búsqueda solo oculta filas visualmente — no elimina datos.

**Búsqueda con grupos:** Si una variante coincide con la búsqueda, se trae el grupo completo del padre (todas las variantes hermanas). Si el padre coincide, también trae todas sus variantes.

### Columnas

| Columna   | Componente              | Condicional              | Notas                            |
| --------- | ----------------------- | ------------------------ | -------------------------------- |
| ▶         | Chevron                 | Solo en headers grupo    | Expand/collapse variantes        |
| Producto  | Texto                   | No                       | Nombre + consecutivo/barcode (font-mono) + chips variante |
| Cant      | NumericInput / "Servicio" | No                     | Servicios muestran texto "Servicio" (qty=1 fijo). Productos físicos: NumericInput con displayDecimals |
| Precio    | NumericInput (currency) | No                       | Prefijo $, displayDecimals       |
| Dcto      | Toggle %/$ + NumericInput | No                     | Toggle cambia interpretación     |
| Impuesto  | TaxSelect (isTax=true)  | No                       | Solo impuestos, no retenciones   |
| Bodega    | SearchableSelect (useUserStorages) | `inventory_management` | Solo productos físicos. Filtra por almacenes asignados al usuario. Label "Almacén / Bodega" si múltiples almacenes. |
| CC        | CostCenterCascadeSelect | `cost_centers`           | Cascada jerárquica               |
| Total     | FormattedNumber         | No                       | Readonly, auto-calculado         |
| ×         | Trash2                  | No                       | Eliminar línea                   |

### Cálculos por línea (Decimal.js, 4 decimales ROUND_HALF_UP)

```
line_subtotal = quantity × unit_price
discount_amount = is_discount_rate ? line_subtotal × discount_input / 100 : min(discount_input, line_subtotal)
net_amount = line_subtotal - discount_amount
tax_amount = net_amount × tax_rate / 100
line_total = net_amount + tax_amount
```

### Agrupación de variantes

- Productos con `parent_product_id` se agrupan bajo un header de grupo
- Header azul: nombre padre, cantidad de variantes, total del grupo
- Click en header expande/colapsa las filas hijas
- Variantes muestran atributos como chips azules (ej: "Rojo", "Grande")
- Auto-expand al agregar una variante

### Selección de productos

- SearchableSelect muestra solo productos padre/standalone (filtra `mode !== 'COMBINATION'`)
- **Producto con combinaciones** → abre modal selector de variantes:
  - Buscador por nombre, consecutivo, barcode, atributos
  - Cada variante muestra: **nombre** + **consecutivo** + **barcode** (font-mono) + **chips de atributos** + **precio**
  - Checkboxes para selección múltiple
  - Botón "Agregar (N)" agrega todas las seleccionadas de una vez (batch)
- **Producto sin combinaciones** → agrega directamente como línea
- Precio e impuesto se pre-cargan del producto
- **Sin restricción de duplicados** — se puede agregar el mismo producto/variante múltiples veces (cada vez crea una línea nueva)

## Backend: findForSelect ampliado

Se añadieron campos al endpoint `GET /products/for-select`:

| Campo nuevo         | Tipo             | Descripción                        |
| ------------------- | ---------------- | ---------------------------------- |
| `barcode`           | `string`         | Código de barras del producto      |
| `parent_product_id` | `string \| null` | ID del producto padre (variantes)  |
| `price`             | `string`         | Precio de venta del producto       |
| `tax_included`      | `boolean`        | Si el precio incluye impuesto      |
| `tax_id`            | `string \| null` | ID del impuesto por defecto        |
| `tax_name`          | `string \| null` | Nombre del impuesto (ej: "IVA (19%)") |
| `tax_rate`          | `string \| null` | Tasa del impuesto                  |

## Integración con totales

Los totales de `page.tsx` ahora se computan desde los ítems:

- `subtotalGross`: Suma de `line_subtotal` de todos los ítems
- `lineDiscounts`: Suma de `discount_amount` de todos los ítems
- `subtotal`: `subtotalGross - lineDiscounts`
- `totalTaxes`: Suma de `tax_amount` de todos los ítems
- `taxList`: Impuestos agrupados por `tax_id` para display 1×1 en totales
- `totalIVA`: Total impuestos (base para ReteIVA)

El `documentTotal` del modal de pagos ahora recibe `netPayable` (total a pagar real).
