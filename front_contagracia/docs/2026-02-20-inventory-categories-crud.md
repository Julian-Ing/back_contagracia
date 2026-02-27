# Inventario — CRUD Categorías (Frontend)

**Fecha:** 2026-02-20

## Resumen
Página de inventario con gestión de categorías (crear, editar, eliminar). Tab de productos como placeholder "Próximamente".

## Permisos (frontend-only)
- `inventory.items.view` — acceso a la página (ProtectedRoute)
- `inventory.categories.view` — ver tab de categorías
- `inventory.categories.create` — botón crear
- `inventory.categories.edit` — botón editar (oculto para AIU)
- `inventory.categories.delete` — botón eliminar (oculto para AIU o si tiene productos)

## Archivos Nuevos
- **`src/app/dashboard/inventory/page.tsx`**: Página con Tabs (Productos placeholder + Categorías)
- **`src/modules/inventory/components/CategoriesList.tsx`**: Componente CRUD completo
  - Diseño siguiendo estándar del nuevo front (Card, CardHeader, Badge count, search, dark mode)
  - Búsqueda con debounce 300ms
  - Paginación
  - Modal crear/editar con Dialog
  - Protección AIU: no editar ni eliminar categorías AIU
  - Protección productos: no eliminar si tiene productos
- **`src/modules/inventory/services/categories.service.ts`**: Servicio API usando `inventoryClient`
- **`src/modules/inventory/types/index.ts`**: Interfaces ProductCategory y CategoriesResponse
- **`src/modules/inventory/index.ts`**: Barrel exports
