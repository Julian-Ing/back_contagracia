# Anticipos: conexión a backend real

**Fecha:** 2026-02-11

## Archivos creados

### Servicio
`src/modules/ar-ap/services/prepayments.service.ts`
- `getAll(filters)` → `GET /prepayments` con query params

### Hook
`src/modules/ar-ap/hooks/usePrepayments.ts`
- Estado: search (debounce 300ms), prepaymentType, status, fromDate, toDate, page
- Todos los setters resetean la página a 1

### Tipos
`src/modules/ar-ap/types.ts` — agregados:
- `PrepaymentType`: CLIENT, SUPPLIER, EMPLOYEE
- `PrepaymentStatus`: ACTIVE, APPLIED, REFUNDED, VOIDED
- `PrepaymentItem`, `PrepaymentsResponse`, `PrepaymentsFilters`

### Modal
`src/app/dashboard/prepayments/CreatePrepaymentModal.tsx`
- Componente separado, modal vacío (max-w-4xl)
- Props: `open`, `onOpenChange`

## Página actualizada
`src/app/dashboard/prepayments/page.tsx`
- Reemplazó mock data por datos reales del backend via `usePrepayments`
- Filtros: Input fuzzy search, SearchableSelect tipo/estado, DatePicker desde/hasta
- Botón "Nuevo Anticipo" (permiso `prepayments.create`) abre `CreatePrepaymentModal`
- Tabla 11 columnas, paginación, estados loading/error/empty
