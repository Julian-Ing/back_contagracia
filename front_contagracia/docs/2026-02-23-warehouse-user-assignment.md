# Asignacion de Usuarios a Almacenes

**Fecha:** 2026-02-23

## Descripcion

Modal de asignacion multiple de usuarios a un almacen desde el detalle del almacen (tab Usuarios).

## Flujo

1. En el tab "Usuarios" del detalle del almacen, boton "Asignar usuario" (requiere permiso `canAssignUsers`)
2. Se abre modal con buscador y lista de usuarios del tenant
3. Los usuarios ya asignados se filtran automaticamente
4. Seleccion multiple con checkboxes
5. Al confirmar, se asignan todos los seleccionados de una vez

## Endpoints usados

| Servicio | Metodo | Ruta | Descripcion |
|----------|--------|------|-------------|
| users-service | GET | `/users?search=&isActive=true&take=20` | Lista usuarios del tenant (company_id del JWT) |
| inventory-service | POST | `/warehouses/:id/users` | Asigna usuarios al almacen |
| inventory-service | DELETE | `/warehouses/:id/users/:userId` | Desasigna usuario (ya existia) |

## Arquitectura

- Los usuarios se listan via `usersClient` (users-service, puerto 3004)
- NO se pasa `company_id` en la URL — se extrae del JWT automaticamente
- La asignacion se hace via `inventoryClient` (inventory-service, puerto 3006)
- Relacion many-to-many: un usuario puede estar asignado a multiples almacenes

## Componente modificado

**`modules/inventory/components/WarehouseDetail.tsx`**

### Estados agregados
- `userSearch` — texto de busqueda
- `availableUsers` — lista de TenantUser del servicio
- `loadingUsers` — estado de carga
- `selectedUserIds` — Set con IDs seleccionados
- `userDebounceRef` — debounce 300ms para busqueda

### Funcionalidades
- Busqueda con debounce 300ms via `usersService.getUsers()`
- Filtra usuarios ya asignados al almacen (`assignedIds`)
- Seleccion multiple con checkboxes visuales
- Muestra nombre, email y rol de cada usuario
- Contador de seleccionados en footer del modal
- Asignacion batch via `warehousesService.assignUsers()`
- Refresca detalle del almacen despues de asignar
