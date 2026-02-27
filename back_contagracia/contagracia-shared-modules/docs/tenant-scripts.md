# Scripts de Migraciones y Seeds para Tenants

## Descripcion

Scripts para aplicar migraciones y seeds a todas las bases de datos de tenants de forma automatizada.

## Scripts Disponibles

### migrate-all-tenants.ts

Aplica migraciones del schema-tenant a todas las empresas activas.

```bash
cd contagracia-shared-modules
npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force
```

**Opciones:**
- `--dry-run`: Solo muestra que haria, sin ejecutar
- `--force`: No pide confirmacion

**Proceso:**
1. Obtiene todas las empresas activas de master
2. Para cada empresa, construye la URL de conexion
3. Ejecuta `prisma db push` con el schema-tenant

### seed-all-tenants.ts

Replica catalogos parametricos de master a todos los tenants.

```bash
cd contagracia-shared-modules
npx ts-node --transpile-only prisma/scripts/seed-all-tenants.ts --force
```

**Datos replicados:**
- Departamentos y Municipios
- Tipos de Documento de Identificacion
- Tipos de Organizacion
- Tipos de Regimen
- Tipos de Responsabilidad

## Cambios Recientes

- **2026-01-29**: Corregido campo `name` a `company_name` en ambos scripts para coincidir con el schema actual

## Ejemplo de Salida

```
Migrate All Tenants Script
=============================

Found 1 active tenant(s)

Tenants to migrate:
  1. EMPRESA XYZ (tenant_empresa_xyz)

[1/1] Migrating: EMPRESA XYZ (tenant_empresa_xyz)
  Success

Migration Summary
Successful: 1
Failed: 0
```
