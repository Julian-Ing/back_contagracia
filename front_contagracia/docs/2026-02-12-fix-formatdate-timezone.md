# Fix: formatDate timezone bug en múltiples páginas

**Fecha:** 2026-02-12

## Problema

Las fechas tipo `@db.Date` llegan del backend como `"2026-02-12T00:00:00.000Z"` (midnight UTC). Al parsearlas con `new Date(dateString)` en Colombia (UTC-5), midnight UTC es 7:00 PM del día anterior, mostrando Feb 11 en vez de Feb 12.

## Solución

Patrón seguro: extraer Y-M-D y crear fecha local sin timezone:
```typescript
const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
return new Date(y, m - 1, d).toLocaleDateString('es-CO', { ... });
```

Ya existía correctamente en `shared/utils/formatDate.ts`. Se corrigieron las definiciones locales.

## Archivos corregidos

### Buggy (`new Date(dateString)` directo)
- `app/blog/page.tsx`
- `app/blog/[slug]/page.tsx` (2 instancias)
- `modules/time-attendance/components/OvertimeList.tsx`
- `modules/time-attendance/components/AttendanceList.tsx`
- `app/admin/user-accounts/page.tsx`

### Frágiles (`d + 'T00:00:00'` — falla si fecha ya tiene T)
- `app/dashboard/accounts-receivable/page.tsx`
- `app/dashboard/accounts-payable/page.tsx`
- `app/dashboard/accounts-receivable/components/BalanceDetailModal.tsx`
- `app/dashboard/page.tsx`

### Consistencia
- `app/dashboard/prepayments/page.tsx` (migrado al mismo patrón)

## Referencia segura

`shared/utils/formatDate.ts` ya usa el patrón correcto. Las páginas que importan de ahí no tenían el bug:
- JournalEntriesList, JournalEntryDetail, AccountingPeriodsList, ClosingPreviewModal, BankMovementsModal
