# Migracion: display_order en type_documents

**Fecha:** 2026-02-21

## Descripcion
Se agrego la columna `display_order` (INTEGER, nullable) a la tabla `type_documents` en la base de datos master. Esta columna ya existia en el schema de Prisma pero no habia sido migrada a la DB, lo que causaba un error P2022 al hacer upsert en el seed.

## Problema
El seed master (`prisma/seed.ts`) fallaba en `TypeDocument.upsert()` con error:
```
PrismaClientKnownRequestError: The column 'existe' does not exist in the current database.
```
Esto ocurria porque el schema de Prisma tenia `display_order Int?` pero la tabla en la DB no tenia esa columna. El drift entre schema y DB causaba un error interno de Prisma (P2022).

Al fallar el seed en TypeDocuments, nunca se llegaba a la seccion de ConsecutiveTypes, dejando tipos como `product_attribute_option` sin configurar en master ni en tenants.

## Solucion
- Migracion: `20260221192859_add_display_order_to_type_documents`
- SQL: `ALTER TABLE "type_documents" ADD COLUMN "display_order" INTEGER;`
- Despues de aplicar la migracion, se corrio `seed.ts` y `seed-all-tenants.ts --force` exitosamente
- Los 52 consecutive types quedaron correctamente propagados al tenant

## Archivos
- `prisma/migrations/20260221192859_add_display_order_to_type_documents/migration.sql`
