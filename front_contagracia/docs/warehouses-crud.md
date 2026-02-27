# Almacenes — Frontend

**Fecha:** 2026-02-20

## Ubicación

- **Lista:** `/dashboard/warehouses`
- **Detalle:** `/dashboard/warehouses/[id]`
- **Módulo:** `src/modules/inventory/`
- **Módulo requerido:** `inventory_management`

## Componentes

### WarehousesList (`components/WarehousesList.tsx`)
Lista de almacenes con búsqueda, paginación y CRUD modal.
- Click en fila navega al detalle
- Columnas: Código, Nombre, Bodegas (count), Usuarios (count), Acciones
- Permisos: `warehouses.create/edit/delete`

### WarehouseDetail (`components/WarehouseDetail.tsx`)
Página de detalle con tabs:
- **Tab Bodegas:** CRUD de bodegas del almacén, muestra counts de productos y movimientos
- **Tab Usuarios:** Lista de usuarios asignados con opción de desasignar
- Permisos: `warehouses.edit/delete`, `storages.create/edit/delete`, `warehouses.users.assign`

## Sidebar corregido
- Almacenes: `modules: ['inventory_management']`, `permission: 'warehouses.view'`
- Bodegas: `modules: ['inventory_management']`, `permission: 'storages.view'`
- Transferencias: `modules: ['inventory_management']`, `permission: 'transfers.view'`

## Archivos

### Creados
- `src/modules/inventory/components/WarehousesList.tsx`
- `src/modules/inventory/components/WarehouseDetail.tsx`
- `src/modules/inventory/services/warehouses.service.ts`
- `src/app/dashboard/warehouses/page.tsx`
- `src/app/dashboard/warehouses/[id]/page.tsx`

### Modificados
- `src/modules/inventory/types/index.ts` — Tipos Warehouse*, Storage*, WarehouseUser*
- `src/modules/inventory/index.ts` — Exports agregados
- `src/config/navigation.ts` — Corregidos módulos y permisos del sidebar
