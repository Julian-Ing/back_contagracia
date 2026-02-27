# Almacen Principal + Campo `is_principal` + Sync automatico

**Fecha:** 2026-02-23

## Resumen

Cuando se agrega el modulo `inventory_management` a un plan, se crea automaticamente un almacen y bodega "Principal" para cada empresa suscrita. El almacen principal no se puede eliminar.

## Cambios

### Schema Prisma (`schema-tenant.prisma`)

- `Warehouse.is_principal Boolean @default(false)`
- `Storage.is_principal Boolean @default(false)`

### inventory-service

**`warehouses.service.ts`**
- Nuevo metodo `ensurePrincipal(companyId)`:
  1. Idempotente: si ya existe almacen principal, no hace nada
  2. Crea Warehouse `{ name: 'Principal', is_principal: true }` con consecutive
  3. Crea Storage `{ name: 'Principal', is_principal: true }` con consecutive
  4. Asigna TODOS los `tenant_users` activos al almacen
  5. Para cada producto no-servicio con `stock > 0`: crea `StorageStock`
- `delete()`: rechaza eliminar almacen principal (409 Conflict)
- `deleteStorage()`: rechaza eliminar bodega principal (409 Conflict)
- `findAll()` y `findOne()`: incluyen `is_principal` en respuestas

**Nuevo modulo `internal/`**
- `InternalController`: `POST /api/internal/ensure-principal` (`@Public()`)
- `InternalModule`: importa `WarehousesModule`
- Registrado en `app.module.ts`

### admin-service

**`plans.service.ts`**
- Nuevo metodo `syncInventoryForPlanCompanies(planId)`: mismo patron que `syncDianForPlanCompanies()`
- `setPlanModules()`: llama `syncInventoryForPlanCompanies()` despues de propagar modulos
- `addPlanModule()`: si `module_key === 'inventory_management'`, llama sync inventario

**`companies.service.ts`**
- Nuevo metodo `syncInventoryForCompany(companyId, planId)`: verifica si el plan tiene `inventory_management` y hace POST
- `manageSubscription()`: llama `syncInventoryForCompany()` al cambiar plan

**`.env`**
```
COMPANY_SERVICE_SYNC_URL="http://localhost:3003/api/companies/internal/sync-dian"
INVENTORY_SERVICE_SYNC_URL="http://localhost:3006/api/internal/ensure-principal"
```

**Nota:** Se corrigio `COMPANY_SERVICE_SYNC_URL` que estaba sin el prefijo `/api/`.

### Workspace

- `pnpm-workspace.yaml`: habilitado `admin-service`
- `package.json`: agregado `admin-service` a script `dev:all`

### Frontend

**`types/index.ts`**
- `is_principal: boolean` en `WarehouseListItem`, `StorageItem`, `WarehouseDetail`

**`WarehousesList.tsx`**
- Badge "Principal" si `w.is_principal`
- Oculta boton eliminar si `w.is_principal`

**`WarehouseDetail.tsx`**
- Badge "Principal" en header si `warehouse.is_principal`
- Badge "Principal" en fila de bodega si `s.is_principal`
- Oculta boton eliminar bodega si `s.is_principal`

## Flujo

```
Admin agrega inventory_management al plan
  -> admin-service: setPlanModules() o addPlanModule()
    -> propagatePlanModulesToTenants()
    -> syncInventoryForPlanCompanies()
      -> HTTP POST inventory-service/api/internal/ensure-principal { company_id }
        -> ensurePrincipal():
          1. Existe principal? -> return
          2. Crear almacen Principal (is_principal: true)
          3. Crear bodega Principal (is_principal: true)
          4. Asignar todos los usuarios
          5. Sincronizar stock de productos a StorageStock
```

## Protecciones

- No se puede eliminar almacen principal -> 409 Conflict
- No se puede eliminar bodega principal -> 409 Conflict
- Si se puede renombrar
- `ensurePrincipal` es idempotente (llamar N veces = mismo resultado)
