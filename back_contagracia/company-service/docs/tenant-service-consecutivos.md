# Actualizacion tenant.service.ts - Consecutivos

## Descripcion
Se actualizo el servicio de tenant para incluir la replicacion de `consecutive_types` y la inicializacion de `consecutives` al crear un nuevo tenant.

## Cambios en replicateParametrics()

### Nuevo Fetch desde Master
```typescript
consecutiveTypes = await this.prisma.consecutiveType.findMany()
```

### Nueva Replicacion a Tenant

1. **consecutive_types** (catalogo):
```typescript
await Promise.all(
  consecutiveTypes.map((ct) =>
    tenantPrisma.consecutiveType.upsert({
      where: { type: ct.type },
      create: {
        type: ct.type,
        default_prefix: ct.default_prefix,
        description: ct.description,
      },
      update: {},
    }),
  ),
);
```

2. **consecutives** (inicializacion):
```typescript
await Promise.all(
  consecutiveTypes.map((ct) =>
    tenantPrisma.consecutive.upsert({
      where: { type: ct.type },
      create: {
        type: ct.type,
        prefix: ct.default_prefix, // Usa default_prefix
        last_number: 0,            // Inicia en 0
      },
      update: {},
    }),
  ),
);
```

## Flujo Completo

1. Usuario crea empresa
2. `createTenantDatabase()` crea la BD
3. `runTenantMigrations()` aplica el schema
4. `replicateParametrics()` copia datos de master:
   - Departamentos, municipios
   - Tipos de documento, organizacion, regimen
   - Bancos, metodos de pago
   - Impuestos
   - **consecutive_types** (NUEVO)
   - **consecutives** (NUEVO)
   - Plan de cuentas, etc.
5. `createOwnerTenantUser()` crea el usuario owner

## Archivo Modificado
- `company-service/src/modules/tenant/tenant.service.ts`
