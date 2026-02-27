# Página dedicada de Bodegas y refactorización de WarehouseDetail

**Fecha:** 2026-02-23
**Tipo:** Nueva funcionalidad + Refactorización

---

## Resumen

Se creó una página independiente para la gestión de bodegas (`/dashboard/storages`) y se eliminó la pestaña de "Bodegas" del detalle de almacén (`WarehouseDetail`). Esto separa la responsabilidad: las bodegas ahora se gestionan globalmente desde su propia ruta, y el detalle del almacén se simplifica mostrando únicamente la sección de usuarios (condicionada por permisos).

---

## Archivos modificados / creados

### Nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/modules/inventory/components/StoragesList.tsx` | Componente principal de la página de bodegas (333 líneas). Tabla con columnas Código, Nombre, Almacén, Productos. Incluye búsqueda con debounce (fuzzy), diálogo de creación (selector de almacén + nombre), diálogo de edición (solo nombre), eliminación con confirmación, badge `is_principal`, paginación y permisos via props (`canCreate`, `canEdit`, `canDelete`). |
| `src/app/dashboard/storages/page.tsx` | Página protegida con `ProtectedRoute` usando el permiso `storages.view`. Renderiza `StoragesList` pasando los permisos correspondientes. |

### Modificados

| Archivo | Cambio |
|---------|--------|
| `src/modules/inventory/index.ts` | Se agregó la exportación de `StoragesList`. |
| `src/modules/inventory/services/warehouses.service.ts` | Se agregó el método `getAllStorages(params)` que consume `GET /warehouses/storages/list` con soporte de búsqueda, paginación y límite. Se importó el tipo `StoragesResponse`. |
| `src/modules/inventory/types/index.ts` | Se agregaron las interfaces `StorageListItem` (id, consecutive, name, is_principal, warehouse_id, warehouse_name, warehouse_consecutive, products_count, created_at) y `StoragesResponse` (data, total, page, limit, totalPages, hasMore). |
| `src/modules/inventory/components/WarehouseDetail.tsx` | Se eliminó toda la pestaña de "Bodegas" (tabla CRUD + modal de crear/editar bodega). Se eliminaron imports no usados (`Label`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Pencil`, `MapPin`, `Package`, `Activity`). Se eliminaron las props `canEdit`, `canDelete`, `canCreateStorage`, `canEditStorage`, `canDeleteStorage`. Se eliminaron los estados y handlers de bodega (`storageModalOpen`, `editingStorage`, `storageName`, `savingStorage`, `openCreateStorage`, `openEditStorage`, `handleSaveStorage`, `handleDeleteStorage`). Se eliminó el import de `StorageItem`. La sección de usuarios ahora se renderiza directamente (sin tabs) y solo si `canAssignUsers` es `true`. |
| `src/app/dashboard/warehouses/[id]/page.tsx` | Se eliminaron las props de permisos de bodegas; solo se pasa `canAssignUsers`. |

---

## Permisos involucrados

| Permiso | Uso |
|---------|-----|
| `storages.view` | Acceso a la página `/dashboard/storages` (ProtectedRoute) |
| `storages.create` | Botón "Crear bodega" en `StoragesList` |
| `storages.edit` | Botón "Editar" por fila en `StoragesList` |
| `storages.delete` | Botón "Eliminar" por fila en `StoragesList` |
| `warehouses.users.assign` | Sección de usuarios en `WarehouseDetail` (renderizado condicional) |

---

## Endpoint consumido

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/warehouses/storages/list` | Lista todas las bodegas con búsqueda fuzzy y paginación. Ya existía en el backend previamente. |

---

## Uso de WarehouseSelect y StorageSelect con opción de crear

Se reemplazaron los `Select` genéricos y `SearchableSelect` por los componentes dedicados `WarehouseSelect` y `StorageSelect` (ubicados en `src/shared/components/ui/`) en todos los selects de almacén y bodega del módulo de inventario.

Estos componentes:
- Hacen fetch propio de datos (no necesitan cargar opciones externamente)
- Incluyen buscador inline
- Tienen botón "+ Nuevo almacén" / "+ Nueva bodega" (condicionado por permisos `warehouses.create` / `storages.create`)
- Permiten crear sin salir del flujo actual

### Archivos actualizados

| Archivo | Cambio |
|---------|--------|
| `StoragesList.tsx` | Diálogo de crear bodega: `WarehouseSelect` en lugar de `Select` genérico. Eliminado `warehouseOptions` state y `loadWarehouseOptions()`. |
| `CreateStorageTransferDialog.tsx` | Selects de **Entra a** (destino): `WarehouseSelect` + `StorageSelect` en lugar de `SearchableSelect`. Eliminados `allWarehouseOptions` y `getInStorageOptions()`. |
| `CreateProductTransferDialog.tsx` | Selects de **Entradas** (IN): `WarehouseSelect` + `StorageSelect` en lugar de `SearchableSelect`. Eliminados `allWarehouseOptions` y `getInStorageOptions()`. |
| `AdjustStockDialog.tsx` | Ya usaba `WarehouseSelect` + `StorageSelect` (sin cambios). |

**Nota:** Los selects de **Salidas (OUT)** en las transferencias siguen usando `SearchableSelect` porque sus opciones dependen del stock del producto seleccionado (filtrado dinámico por almacenes/bodegas con stock > 0), lo cual no aplica para el componente genérico.

---

## Notas generales

- La búsqueda en `StoragesList` usa debounce de 400ms y soporta fuzzy matching (por nombre de bodega, código de bodega, nombre de almacén o código de almacén).
- Las bodegas marcadas como `is_principal` muestran un badge naranja y no pueden editarse ni eliminarse.
- El componente `WarehouseDetail` se redujo significativamente (~280 líneas eliminadas) al extraer la gestión de bodegas a su propia página.
