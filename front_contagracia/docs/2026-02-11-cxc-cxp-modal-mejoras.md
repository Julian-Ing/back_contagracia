# CxC/CxP: Modal detalle, filtros server-side, terceros genericos - 2026-02-11

## Archivos modificados

- `src/app/dashboard/accounts-receivable/page.tsx`
- `src/app/dashboard/accounts-payable/page.tsx`
- `src/app/dashboard/accounts-receivable/components/BalanceDetailModal.tsx`
- `src/modules/ar-ap/types.ts`
- `src/modules/ar-ap/services/arAp.service.ts`
- `src/modules/ar-ap/hooks/useArApSummary.ts`

---

## 1. Modal de detalle — Reescritura completa

**Archivo:** `BalanceDetailModal.tsx`

### Propiedades en ingles
Todas las interfaces internas del modal usan nombres en ingles:
- Transaction: `type_label`, `number`, `date`, `due_date`, `amount`, `paid`, `balance`, `status`, `days_overdue`, `days_due`, `description`
- Payment: `consecutive`, `date`, `amount`, `payment_method`, `reference`, `payment_type`
- Summary: `total_invoiced`, `total_paid`, `total_balance`
- Props de paginacion: `tx_search`, `tx_page`, `tx_total_pages`, `tx_total`

### Filtros en el modal
- **Estados** (PENDING/PARTIAL/PAID): Botones toggle interactivos
- **Vencimiento** (Todos/Vencidos/Al dia): Botones toggle
- **Busqueda**: Input con debounce 400ms, busqueda server-side
- **Paginacion**: Server-side, 10 registros por pagina

### Columna de dias
- Dias vencidos: `-Xd` en rojo
- Dias hasta vencimiento: `Xd` en verde
- Vence hoy: `Hoy` en naranja
- Solo se muestra si el documento tiene saldo pendiente y fecha de vencimiento

### Tipo de documento
Muestra `source_description` del backend (ej: "Asiento Manual") en vez del source_key.

### Columna descripcion
Muestra el campo `description` del ArAp.

---

## 2. Busqueda y paginacion server-side

Toda la busqueda, filtrado y paginacion se hace en el backend. El frontend solo muestra los datos.

### Servicio frontend (`arAp.service.ts`)
Parametros agregados al `getThirdPartyDetail`:
- `page`, `limit` — paginacion
- `statuses` — filtro de estados (comma-separated)
- `overdue` — filtro de vencimiento ('all' | 'overdue' | 'current')

### Tipos (`types.ts`)
- `ArApTransaction`: agregados `description` y `days_due`
- `ArApDetailResponse`: agregados `txTotal`, `txPage`, `txTotalPages`
- `ArApDetailFilters`: agregados `page`, `limit`, `statuses`, `overdue`
- `ArApSummaryItem`: agregados `total_docs` y `paid_docs`

---

## 3. Eliminacion del tab "Pagados"

Eliminado el tab "Pagados" de ambas paginas (CxC y CxP). Razon: el modal ya tiene filtros de estado que permiten ver documentos pagados.

### Cambios
- Tab state: `'pendientes' | 'pagados' | 'recibos'` → `'pendientes' | 'recibos'`
- Hook `useArApSummary`: default de tab cambiado de `'pending'` a `'all'` para mostrar todos los terceros
- Summary cards: siempre muestra las 4 tarjetas (sin condicional por tab)
- Tabla: una sola version de columnas (sin variante pagados)
- Bucket filter: siempre visible (sin condicional por tab)

---

## 4. Terceros genericos (no cliente/proveedor)

CxC y CxP no son exclusivas de clientes o proveedores. Cualquier tercero puede tener una CxC o CxP (ventas, compras, manuales, etc.).

### Etiquetas cambiadas
| Antes | Despues |
|-------|---------|
| Total Clientes / Total Proveedores | Total Terceros |
| Buscar cliente... / Buscar proveedor... | Buscar tercero... |
| Columna "Cliente" / "Proveedor" | Columna "Tercero" |
| Total Facturado / Total Comprado | Total CxC / Total CxP |
| Total Pagado (CxC) | Total Recaudado |
| Ultima Factura / Ultima Compra | Ultimo Doc. |
| Docs Pendientes | Docs (con desglose total/pend./pag.) |
| Balance Detallado - Cliente/Proveedor | Balance Detallado - Tercero |
| Facturas / Documentos (tab modal) | Documentos |
| Recibos de Caja / Comprobantes (tab modal) | Pagos |

### Columna "Docs"
Muestra desglose: `X total`, badge `Y pend.`, badge `Z pag.`

---

## 5. SearchableSelect

Reemplazado `Select` por `SearchableSelect` en el filtro de vencimiento (bucket) de ambas paginas. Componente con fuzzy search integrado.

---

## 6. Paginas (accounts-receivable/page.tsx y accounts-payable/page.tsx)

### Estado del modal
- `modalSearch`, `modalPage`, `modalStatuses`, `modalOverdue` — estados locales
- `searchTimerRef` — debounce de busqueda
- `fetchDetail(terceroId, opts)` — fetch con search/page/statuses/overdue
- Callbacks: `handleModalSearch`, `handleModalPageChange`, `handleModalStatusesChange`, `handleModalOverdueChange`

### Mapeo de datos al modal (ingles)
```tsx
transactions: modalDetails.transactions.map((t) => ({
  id: t.id,
  type_label: t.source_description,
  number: t.source_number || t.consecutive || '-',
  date: t.date,
  due_date: t.due_date || '',
  amount: t.amount,
  paid: t.paid,
  balance: t.balance,
  status: t.status,
  days_overdue: t.days_overdue,
  days_due: t.days_due,
  description: t.description || '',
}))
```
