# Fix: bugs menores de tipos (Company logo_url, inventory ForSelectResponse)

**Fecha:** 2026-02-26

## Fix 1 — Campo duplicado logo_url en tipo Company

### Problema

El tipo `Company` en `src/modules/company/types/index.ts` tenia el campo `logo_url` declarado dos veces, causando advertencia de TypeScript por campo duplicado.

### Solucion

Eliminado el campo `logo_url` duplicado, conservando una sola declaracion.

### Archivo

| Archivo | Cambio |
|---------|--------|
| `src/modules/company/types/index.ts` | Eliminado campo `logo_url` duplicado |

---

## Fix 2 — ForSelectResponse en CreateStorageTransferDialog

### Problema

`CreateStorageTransferDialog` trataba el resultado de `getForSelect()` como un array directo:

```typescript
const products = await getForSelect();
products.map(...)  // ERROR: products es ForSelectResponse, no array
```

`getForSelect()` retorna un objeto `ForSelectResponse` con propiedad `data` (el array), no un array directamente.

### Solucion

Cambiado a acceder la propiedad `data`:

```typescript
const products = await getForSelect();
products.data.map(...)  // CORRECTO
```

### Archivo

| Archivo | Cambio |
|---------|--------|
| `src/modules/inventory/components/CreateStorageTransferDialog.tsx` | Cambiado `products.map(...)` a `products.data.map(...)` |
