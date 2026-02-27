# Tabla SiteSetting y Extensión pg_trgm para Búsqueda Fuzzy

**Fecha:** 2026-02-19
**Autor:** Claude Code
**Tipo:** Migración de Schema Master + Extensión PostgreSQL

## Resumen

Se agregó la tabla `SiteSetting` al schema master para configuración del sitio web público y se habilitó la extensión `pg_trgm` de PostgreSQL para búsqueda fuzzy en la tabla `modules`.

## Cambios en Schema

### Nueva Tabla: SiteSetting

```prisma
model SiteSetting {
  key         String   @id
  value       String?  @db.Text
  description String?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@map("site_settings")
}
```

**Propósito:** Almacenar configuraciones del sitio web público como:
- `site_title`: Título del sitio
- `site_description`: Descripción meta
- `site_keywords`: Keywords SEO
- `og_image_url`: Imagen Open Graph
- `favicon_url`: URL del favicon

**Ubicación:** Base de datos master (configuración global, no por tenant)

## Extensión pg_trgm

Se habilitó la extensión `pg_trgm` de PostgreSQL para búsqueda fuzzy usando trigramas.

### Índices GIN Creados

```sql
CREATE INDEX idx_modules_module_name_trgm ON "modules" USING GIN (module_name gin_trgm_ops);
CREATE INDEX idx_modules_module_key_trgm ON "modules" USING GIN (module_key gin_trgm_ops);
```

**Propósito:** Permitir búsquedas rápidas con tolerancia a errores tipográficos en nombres y claves de módulos.

## Migraciones

### Migración 1: `20260219110058_add_pg_trgm_and_site_setting`

**Contenido:**
```sql
-- Activar extensión pg_trgm para búsqueda fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear índices GIN para búsqueda fuzzy en modules
CREATE INDEX IF NOT EXISTS idx_modules_module_name_trgm ON "modules" USING GIN (module_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_modules_module_key_trgm ON "modules" USING GIN (module_key gin_trgm_ops);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);
```

### Migración 2: `20260219161527_rename_site_setting_table`

**Problema detectado:** La primera migración creó la tabla con el nombre `SiteSetting` pero el modelo Prisma usa `@@map("site_settings")`, causando que el cliente no encontrara la tabla.

**Solución:**
```sql
-- Eliminar tabla con nombre incorrecto si existe
DROP TABLE IF EXISTS "SiteSetting";

-- Crear tabla con nombre correcto si no existe
CREATE TABLE IF NOT EXISTS "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);
```

**Nota:** Se usó `DROP IF EXISTS` y `CREATE IF NOT EXISTS` para hacer la migración idempotente, permitiendo que funcione tanto en ambientes donde existe la tabla incorrecta como en ambientes donde ya se aplicó correctamente.

## Servicio Implementado

### admin-service: SiteSettingsService

**Ubicación:** `admin-service/src/modules/site-settings/`

**Endpoints:**
- `GET /site-settings` - Listar todas las configuraciones
- `GET /site-settings/:key` - Obtener una configuración específica
- `PUT /site-settings/:key` - Crear o actualizar una configuración
- `GET /site-settings/public/metadata` - Obtener metadata pública del sitio

**Uso:**
```typescript
// Obtener metadata pública
const metadata = await siteSettingsService.getPublicMetadata();
// { site_title: "...", site_description: "...", ... }

// Actualizar configuración
await siteSettingsService.upsert('site_title', 'Mi Sitio Web');
```

## Lecciones Aprendidas

### ⚠️ IMPORTANTE: Nombres de Tabla y @@map

**Problema:** Al crear migraciones manualmente, se debe respetar el mapeo definido en el schema con `@@map()`.

**Regla:**
- Si el modelo tiene `@@map("nombre_tabla")`, la tabla en PostgreSQL DEBE llamarse `nombre_tabla`
- NO usar el nombre del modelo Prisma directamente en el SQL

**Correcto:**
```sql
-- Modelo: model SiteSetting { @@map("site_settings") }
CREATE TABLE "site_settings" (...)
```

**Incorrecto:**
```sql
-- Modelo: model SiteSetting { @@map("site_settings") }
CREATE TABLE "SiteSetting" (...)  -- ❌ Prisma no la encontrará
```

### Regeneración de Clientes Prisma

Después de aplicar migraciones que cambian el schema:

1. **En contagracia-shared-modules:**
   ```bash
   pnpm prisma:generate
   pnpm build:all
   ```

2. **En backend (raíz):**
   ```bash
   pnpm install
   ```

3. **Reiniciar servicios completamente** (NO solo hot-reload)
   - Detener con Ctrl+C
   - Volver a ejecutar `pnpm dev`

**Nota:** El hot-reload de NestJS NO recarga clientes de Prisma correctamente. Siempre hacer restart completo.

## Ejecución de Migraciones

```bash
# 1. En contagracia-shared-modules
cd contagracia-shared-modules

# 2. Aplicar en master
npx prisma migrate deploy --schema=prisma/schema-master.prisma

# 3. Aplicar en todos los tenants (aunque esta tabla es solo master)
npx ts-node prisma/scripts/migrate-all-tenants.ts

# 4. Regenerar clientes y rebuild
pnpm prisma:generate
pnpm build:all

# 5. Reinstalar en backend
cd ..
pnpm install

# 6. Reiniciar servicios
```

## Archivos Modificados

### Schema
- `contagracia-shared-modules/prisma/schema-master.prisma`
  - Agregado modelo `SiteSetting`

### Migraciones
- `contagracia-shared-modules/prisma/migrations/20260219110058_add_pg_trgm_and_site_setting/`
- `contagracia-shared-modules/prisma/migrations/20260219161527_rename_site_setting_table/`

### Servicio
- `admin-service/src/modules/site-settings/site-settings.service.ts` (nuevo)
- `admin-service/src/modules/site-settings/site-settings.controller.ts` (nuevo)
- `admin-service/src/modules/site-settings/site-settings.module.ts` (nuevo)

## Testing

```bash
# Verificar que la extensión está habilitada
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';

# Verificar que los índices existen
SELECT indexname FROM pg_indexes WHERE tablename = 'modules' AND indexname LIKE '%trgm%';

# Verificar que la tabla existe con el nombre correcto
SELECT table_name FROM information_schema.tables WHERE table_name = 'site_settings';

# Probar búsqueda fuzzy
SELECT * FROM modules WHERE module_name % 'conabilida';  -- Encuentra "contabilidad"
```

## Referencias

- [Documentación pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Prisma @@map](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#map-1)
