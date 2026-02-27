# Asiento Contable Mejorado, CXC/CXP Lectura, Selects con Portal - 2026-02-10

## Commit: 17ecd11 + cambios uncommitted

---

## 1. Modulo ar-ap frontend (NUEVO)

**Archivos nuevos:**
- `src/modules/ar-ap/types.ts` — Interfaces: ArApSummaryItem, ArApDetailResponse, ArApTransaction, ArApPayment, PaymentReceiptItem, BucketFilter, SummaryTab
- `src/modules/ar-ap/services/arAp.service.ts` — Usa accountingClient. Metodos: getSummaryByThirdParty, getThirdPartyDetail, getPaymentReceipts
- `src/modules/ar-ap/hooks/useArApSummary.ts` — Hook con filtros manuales para CXC/CXP
- `src/modules/ar-ap/hooks/usePaymentReceipts.ts` — Hook con enabled/loaded para recibos/comprobantes
- `src/modules/ar-ap/index.ts` — Barrel exports

## 2. CXC y CXP paginas — Datos reales + filtros manuales

**Archivos:**
- `src/app/dashboard/accounts-receivable/page.tsx`
- `src/app/dashboard/accounts-payable/page.tsx`
- `src/app/dashboard/accounts-receivable/components/BalanceDetailModal.tsx`

**Commit 17ecd11:** Reemplazo de datos mock por datos reales del backend. Tabs Pendientes/Pagados/Recibos. Modal de detalle con transacciones y pagos reales. Summary cards calculados desde datos reales. Botones de accion (Nuevo Recibo, Exportar Excel/PDF, etc.) habilitados con toast "Proximamente".

**Uncommitted:** Todos los filtros cambiados a manuales. Ningun filtro dispara API call automaticamente. Solo se busca al:
- Click en boton "Buscar"
- Enter en input de busqueda
- Cambio de tab Pendientes/Pagados
- Paginacion

Hooks reescritos con AbortController, fetchIdRef, initialLoadDone ref. usePaymentReceipts con parametro `enabled` (carga lazy) y estado `loaded`. Label "Vencimiento" movido arriba del select. Boton "Generar cobro/pago" removido de barra de filtros.

## 3. Formulario de asiento contable

**Archivo:** `src/app/dashboard/accounting/journal-entries/new/page.tsx`

**Commit 17ecd11:** Columnas redimensionables con drag. Filtros por descripcion, tipo D/C, ref_type, cuenta, tercero, banco. Expand fullscreen. Layout inferior: errores + totales + botones en una sola fila.

**Uncommitted:** lineErrorsMap — mapa computado de errores por linea (cuenta vacia, monto 0, descripcion vacia, banco requerido, banco/caja con ref_type no-NORMAL, ref_type sin tercero, ref_type en tipo incorrecto). Boton filtro "X con errores" (AlertTriangle). Lineas con error resaltadas con borde rojo + fondo rojo + tooltip. validationErrors ahora consume lineErrorsMap. Removido auto-reset de reference_type al cambiar cuenta/tercero/tipo.

## 4. RefTypeSelect (NUEVO)

**Archivo:** `src/shared/components/ui/ref-type-select.tsx`

**Commit 17ecd11:** Componente nuevo. Select con badges de color por tipo (CXC verde, CXP rojo, etc.). Bloqueo contextual: sin tercero, banco/caja, tipo incompatible. Portal para overflow en modales.

**Uncommitted:** Opciones ya no se bloquean, solo muestran warning (AlertTriangle en vez de Lock). Texto amber en vez de gris disabled. El usuario puede seleccionar cualquier opcion; errores se muestran en lineErrorsMap.

## 5. Selects con usePortal

**Archivos:**
- `src/shared/components/ui/account-select.tsx`
- `src/shared/components/ui/third-party-select.tsx`
- `src/shared/components/ui/async-searchable-select.tsx`

**Commit 17ecd11:** Prop `usePortal` agregada. Cuando es true, el dropdown se renderiza con createPortal al body para evitar overflow hidden en contenedores con scroll.

## 6. Select — Fuzzy search

**Archivo:** `src/shared/components/ui/select.tsx`

**Uncommitted:** Filtrado de opciones cambiado de includes() a fuzzySearch() con threshold 0.3.

## 7. Dashboard Error Boundary (NUEVO)

**Archivo:** `src/app/dashboard/error.tsx`

**Uncommitted:** Error boundary de Next.js App Router. Captura errores no manejados en /dashboard. Muestra "Algo salio mal" con mensaje y boton Reintentar.
