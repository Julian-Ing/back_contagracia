# Cambios en Schemas - Historial

## 2026-01-29

### schema-master.prisma

#### country_id default Colombia (ID: 46)

**Migración:** `20260129130528_country_id_default_colombia`

Se agregó valor por defecto al campo `country_id` en el modelo `Company`:

```prisma
// Antes
country_id String?

// Después
country_id String? @default("46")
```

**SQL generado:**
```sql
-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "country_id" SET DEFAULT '46';

-- Update existing records
UPDATE "companies" SET "country_id" = '46' WHERE "country_id" IS NULL;
```

**Razón:** Colombia (ID 46) es el país por defecto para todas las empresas registradas.

---

### ERRORES COMETIDOS Y CÓMO SE CORRIGIERON

#### Error: Usar `db push` en lugar de `migrate dev`

**Qué pasó:**
Se usó `prisma db push` para aplicar el cambio del default, lo cual:
1. Aplicó el cambio directamente a la DB sin crear migración
2. Creó "drift" (diferencia entre DB y historial de migraciones)
3. Bloqueó la creación de nuevas migraciones

**Cómo se corrigió:**
1. Se revirtió el schema (quitar `@default("46")`)
2. Se quitó el default de la DB manualmente:
   ```sql
   ALTER TABLE companies ALTER COLUMN country_id DROP DEFAULT;
   ```
3. Se verificó que no hubiera drift: `prisma migrate status`
4. Se volvió a agregar `@default("46")` al schema
5. Se creó la migración correctamente: `prisma migrate dev --name country_id_default_colombia`
6. Se editó el archivo de migración para agregar el UPDATE de registros existentes
7. Se ejecutó el UPDATE manualmente ya que la migración ya había sido aplicada

#### Lección aprendida

**NUNCA usar `prisma db push` en desarrollo si se usan migraciones.**

| Comando | Uso correcto |
|---------|--------------|
| `prisma db push` | Solo para prototipos rápidos SIN migraciones |
| `prisma migrate dev` | Desarrollo con migraciones versionadas |
| `prisma migrate deploy` | Producción |

**Flujo correcto para cambios de schema:**
1. Modificar `schema.prisma`
2. Ejecutar `prisma migrate dev --name descripcion_cambio`
3. Si se necesita modificar datos existentes, editar el `.sql` generado ANTES de que se aplique (usar `--create-only`)
4. Commit del schema + carpeta de migración

---

### schema-tenant.prisma

#### Removido campo 'code' de ProductUnit

Se eliminó el campo `code` del modelo `ProductUnit` para coincidir con el schema master.

**Aplicado con:** `npx prisma db push --schema=./prisma/schema-tenant.prisma`

**Nota:** Para tenants se usa `db push` porque cada tenant tiene su propia DB y no se manejan migraciones versionadas por tenant.

---

## Comandos útiles

```bash
# Ver estado de migraciones
npx prisma migrate status --schema=./prisma/schema-master.prisma

# Crear migración sin aplicar (para editar el SQL)
npx prisma migrate dev --schema=./prisma/schema-master.prisma --name nombre --create-only

# Aplicar migraciones pendientes
npx prisma migrate dev --schema=./prisma/schema-master.prisma

# Ejecutar SQL directo (solo emergencias)
echo "SQL aquí" | npx prisma db execute --stdin --schema=./prisma/schema-master.prisma
```
