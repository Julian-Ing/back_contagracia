# Métodos de Pago: Página CRUD - 2026-02-11

## Archivos modificados/creados

- `src/app/dashboard/payment-methods/page.tsx` (modificado)
- `src/modules/ar-ap/services/companyPaymentMethods.service.ts` (nuevo)
- `src/modules/ar-ap/hooks/useCompanyPaymentMethods.ts` (nuevo)
- `src/modules/ar-ap/types.ts` (modificado)
- `src/modules/ar-ap/index.ts` (modificado)
- `src/modules/banking/types/index.ts` (modificado)

---

## 1. Página /dashboard/payment-methods

CRUD completo con:
- `ProtectedRoute` con permiso `payment_methods.view`
- Header con icono CreditCard (amber)
- Buscador fuzzy search (debounce 300ms)
- Tabla: Consecutivo, Nombre, Tipo, Descripción, Estado, Acciones
- Paginación
- Dialog crear: Tipo (SearchableSelect), Nombre, Descripción
- Dialog editar: Nombre, Descripción, checkbox Activo
- Dialog eliminar: confirmación con botón destructivo
- Permisos: create, edit, delete controlan visibilidad de botones

---

## 2. Service companyPaymentMethods

Métodos: `getAll`, `create`, `update`, `delete`, `getDianPaymentMethods`.

---

## 3. Hook useCompanyPaymentMethods

Estado: data, total, page, totalPages, loading, error, search.
Acciones: setSearch (con debounce), setPage, refetch.

---

## 4. Types agregados

```typescript
interface CompanyPaymentMethod {
  id, consecutive, name, description, is_active,
  payment_method_id, payment_method_name, payment_method_code,
  created_at, updated_at
}

interface CompanyPaymentMethodsResponse { data, total, page, limit, totalPages, hasMore }
interface DianPaymentMethod { id, name, code }
```

---

## 5. CanDeleteBankAccountResponse actualizado

Campos actualizados para reflejar validaciones reales:
- `journalItemsCount`, `bankMovementsCount`, `documentBankPaymentsCount`, `receiptLinesCount`, `reconciliationsCount`
