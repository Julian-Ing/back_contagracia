# TypeOperation — Catálogo DIAN de Tipos de Operación

**Fecha:** 2026-02-25

---

## Resumen

Se agrega la tabla `type_operations` como catálogo DIAN en **master** y **tenant**. El modelo `Document` en tenant ahora tiene `type_operation_id` (nullable, FK) para clasificar el tipo de operación de cada factura/NC/ND según la DIAN.

## Archivos

| Acción     | Archivo                                                              |
| ---------- | -------------------------------------------------------------------- |
| Modificado | `contagracia-shared-modules/prisma/schema-master.prisma`             |
| Modificado | `contagracia-shared-modules/prisma/schema-tenant.prisma`             |
| Creado     | `contagracia-shared-modules/prisma/seeds/typeOperations.ts`          |
| Modificado | `contagracia-shared-modules/prisma/seeds/seed-catalogs.ts`           |
| Modificado | `contagracia-shared-modules/prisma/scripts/seed-all-tenants.ts`      |
| Creado     | `contagracia-shared-modules/prisma/migrations/20260225214402_add_type_operations/migration.sql` |

## Schema

### Master (`schema-master.prisma`)

```prisma
model TypeOperation {
  id         String   @id @default(uuid())
  code       String   @unique
  name       String
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  @@map("type_operations")
}
```

### Tenant (`schema-tenant.prisma`)

Mismo modelo, más relación con `Document`:

```prisma
model TypeOperation {
  id         String   @id @default(uuid())
  code       String   @unique
  name       String
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  documents  Document[]
  @@map("type_operations")
}
```

Campo en `Document`:
```prisma
type_operation_id String?
type_operation    TypeOperation? @relation(fields: [type_operation_id], references: [id])
```

## Datos (27 registros)

Provenientes del SQL DIAN `type_operations`. Categorías:

- **Facturación** (códigos 01-12): Combustibles, Autorretenedor, Excluidos, Exportación, Genérica, AIU, Estándar, Mandatos, etc.
- **Cambiario/Divisas** (códigos 13-16): Cambiario, Notarios, Compra/Venta Divisas
- **Notas Crédito** (códigos 20, 22, 23): Con/sin referencia a factura electrónica
- **Notas Débito** (códigos 30, 32, 33): Con/sin referencia a factura electrónica
- **Doc. Equivalente** (códigos 25, 35, 60): Notas de ajuste
- **Facturación Electrónica** (códigos 601, 602): Normal / En Sitio

## Seeds

- **Master** (`seed-catalogs.ts`): Upsert por `id`, crea 27 registros
- **Tenant** (`seed-all-tenants.ts`): Lee de master con `masterPrisma.typeOperation.findMany()`, upsert por `code` en cada tenant

## Migración Master

Migración `20260225214402_add_type_operations`:
- Crea tabla `type_operations` con PK, unique en `code`
- Ejecutada con `prisma migrate deploy`

**Nota:** Había drift preexistente en master por:
1. Migración `20260224142101_add_media_table` editada post-aplicación (checksum roto) — corregido actualizando checksum en `_prisma_migrations`
2. Índices GIN `pg_trgm` en `modules` creados por seed, no por schema — NO se tocaron, el drift se acepta

## Migración Tenant

Tenant se migra con `migrate-all-tenants.ts` (usa `db push` internamente). Ya ejecutado.
