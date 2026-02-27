# Almacenes, Bodegas y Usuarios — CRUD Backend

**Fecha:** 2026-02-20

## Endpoints

### Almacenes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /warehouses | Lista con fuzzy search, paginación, counts de bodegas/usuarios |
| GET | /warehouses/:id | Detalle con bodegas (+ counts stock/movimientos) y usuarios |
| POST | /warehouses | Crear almacén (nombre único) |
| PATCH | /warehouses/:id | Actualizar nombre |
| DELETE | /warehouses/:id | Soft delete (solo si no hay bodegas con stock) |

### Bodegas (anidadas en almacén)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /warehouses/:id/storages | Crear bodega en almacén |
| PATCH | /warehouses/storages/:storageId | Actualizar bodega |
| DELETE | /warehouses/storages/:storageId | Soft delete (solo si no tiene stock) |

### Usuarios de Almacén
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /warehouses/:id/users | Asignar usuarios (batch, ignora duplicados) |
| DELETE | /warehouses/:id/users/:userId | Desasignar usuario |

### Bodegas del usuario actual (2026-02-21)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /warehouses/me/storages | Almacenes+bodegas del usuario logueado |

Retorna almacenes activos del usuario con sus bodegas activas.
Ruta declarada ANTES de `:id` para evitar colisión de rutas NestJS.

## Validaciones
- Nombre de almacén único entre activos
- Nombre de bodega único dentro del mismo almacén
- No eliminar almacén si alguna bodega tiene StorageStock
- No eliminar bodega con stock registrado
- Al eliminar almacén: desactiva bodegas hijas + elimina asignaciones de usuarios
- Asignación batch: filtra usuarios ya asignados, reporta cuántos nuevos

## Módulo de permisos
`inventory_management` (separado de `inventory`):
- warehouses.view/create/edit/delete/activate/deactivate
- warehouses.stock.view, warehouses.users.assign
- storages.view/create/edit/delete
- transfers.view/create/approve/reject/print

## Archivos
- `src/modules/warehouses/warehouses.module.ts`
- `src/modules/warehouses/warehouses.controller.ts`
- `src/modules/warehouses/warehouses.service.ts`
- `src/modules/warehouses/dto/*.ts` (5 DTOs)
- `src/app.module.ts` — Registrado WarehousesModule
