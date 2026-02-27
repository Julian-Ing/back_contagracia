# Inventario — Corrección permisos de acceso

**Fecha:** 2026-02-20

## Problema
- La página de inventario requería solo `inventory.items.view`, bloqueando usuarios con solo permiso de categorías
- El tab de productos se mostraba siempre sin verificar permiso
- El `defaultValue` de tabs era fijo en `"categories"`, fallaba si el usuario no tenía ese permiso
- El sidebar requería `inventory.items.view` para mostrar el link, excluyendo usuarios con solo categorías

## Solución

### page.tsx
- `ProtectedRoute` cambiado a `anyPermission={['inventory.items.view', 'inventory.categories.view']}` — accede con cualquiera
- Tab productos condicionado a `can('inventory.items.view')`
- Tab categorías condicionado a `can('inventory.categories.view')`
- `defaultValue` dinámico: productos si tiene permiso, sino categorías

### navigation.ts
- Agregado `anyPermission?: string[]` a `NavItemConfig`
- `shouldShowNavItem()` ahora verifica `anyPermission` (OR logic)
- Item "Productos" usa `anyPermission: ['inventory.items.view', 'inventory.categories.view']`

## Archivos Modificados
- `src/app/dashboard/inventory/page.tsx`
- `src/config/navigation.ts`
