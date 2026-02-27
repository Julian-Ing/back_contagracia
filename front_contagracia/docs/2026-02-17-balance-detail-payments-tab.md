# Balance Detallado — Tab de Pagos con Filtros Backend

**Fecha:** 2026-02-17

## Cambios

### BalanceDetailModal — Tab de Pagos reescrito

El tab de Pagos del modal "Balance Detallado - Tercero" ahora busca datos directamente del backend en vez de recibir pagos del componente padre.

**Filtros implementados:**
- **Buscador** con debounce (400ms) — busca por consecutivo pago, descripción, consecutivo CxC/CxP, número doc origen
- **DatePicker** fecha desde / fecha hasta
- **SearchableSelect** tipo de documento — opciones cargadas desde `GET /ar-ap/sources` (tabla `ar_ap_sources`)
- **SearchableSelect** método de pago — opciones cargadas desde `GET /company-payment-methods`
- **Paginación** propia (10 por página)
- **Botón "Limpiar filtros"** cuando hay filtros activos
- **Spinner de carga** sobre la tabla

**Columnas del tab de pagos:**
| Columna | Descripción |
|---------|-------------|
| CxC / CxP | Consecutivo del documento CxC/CxP afectado |
| Doc. Origen | Número del documento que originó la CxC/CxP |
| Consecutivo | Consecutivo del pago |
| Fecha | Fecha del pago |
| Monto | Monto pagado |
| Método de Pago | Nombre del método de pago |
| Descripción | Descripción del pago |
| Tipo Documento | Tipo de documento origen |
| Acciones | Ver, Editar, Anular recibo |

### Cambios en props

- `details.payments` eliminado del prop — el modal busca pagos independientemente
- `onRefresh` agregado en ambas páginas (CxC y CxP) — refresca transacciones + resumen al editar/anular recibos desde el modal

### Tipos y servicio

- `ArApSourceItem` — nuevo tipo `{ key, description }` para tipos de documento
- `arApService.getSources()` — nuevo método que llama `GET /ar-ap/sources`
- `arApService.getThirdPartyPayments()` — existente de sesión anterior

### Limpieza

- Eliminados `conversacionhoy.txt` y `ultimaxd.txt` (logs de conversación que no deben estar en el repo)

## Archivos modificados

- `src/app/dashboard/accounts-receivable/components/BalanceDetailModal.tsx`
- `src/app/dashboard/accounts-receivable/page.tsx`
- `src/app/dashboard/accounts-payable/page.tsx`
- `src/modules/ar-ap/types.ts`
- `src/modules/ar-ap/services/arAp.service.ts`
