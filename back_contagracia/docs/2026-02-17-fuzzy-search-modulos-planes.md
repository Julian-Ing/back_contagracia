# Búsqueda Fuzzy en Módulos - Planes

**Fecha:** 2026-02-17

## Cambios realizados

### Backend (admin-service)

**Archivos modificados:**
- `src/modules/system-actions/system-actions.controller.ts`
- `src/modules/system-actions/system-actions.service.ts`

**Implementación:**
- Agregado parámetro opcional `search` al endpoint `GET /admin/system-actions/modules/all`
- Implementado búsqueda fuzzy con `pg_trgm` usando `word_similarity() > 0.3`
- Búsqueda en campos `module_key` y `module_name` usando ILIKE + word_similarity

```typescript
// Query SQL con pg_trgm
const fuzzyMatches = await this.prisma.$queryRaw<Array<{ id: string }>>`
  SELECT "id" FROM "module"
  WHERE "module_key" ILIKE ${searchPattern}
  OR "module_name" ILIKE ${searchPattern}
  OR word_similarity(${search}, COALESCE("module_name", '')) > 0.3
  OR word_similarity(${search}, COALESCE("module_key", '')) > 0.3
`;
```

### Frontend

**Archivos modificados:**
- `src/modules/admin/services/admin.service.ts`
- `src/modules/admin/components/PlanForm.tsx`

**Implementación:**
- Agregado `FuzzySearchInput` con debounce de 300ms
- Estados: `moduleSearch`, `filteredModules`, `moduleLoading`
- Función `fetchModules()` que consulta al backend con término de búsqueda
- useEffect que resetea búsqueda al cerrar modal
- Muestra loader mientras busca y mensaje cuando no hay resultados

### Limpieza de código obsoleto

**Archivos eliminados:**
- `contagracia-shared-modules/prisma/seeds/modules/actions/radian.ts`

**Archivos modificados:**
- `contagracia-shared-modules/prisma/seeds/modules/index.ts`

**Razón:**
- El archivo `radian.ts` contenía acciones con prefijo incorrecto `radian.*` (debería ser `electronic_documents.radian.*`)
- No se estaba importando ni usando en ningún lado
- Las acciones de RADIAN están correctamente definidas en `electronic_documents.ts`

### Eliminación de módulo obsoleto

**Cambio en seeder:**
- Agregada lógica para eliminar módulo "radian" obsoleto de la DB master
- El módulo "radian" era un módulo separado que quedó de seeds anteriores
- La funcionalidad RADIAN ahora está contenida en el módulo `electronic_documents`

```typescript
// Eliminar módulos obsoletos
const obsoleteModules = ['radian'];
const deletedModules = await prisma.module.deleteMany({
  where: { module_key: { in: obsoleteModules } }
});
```

## Verificación

Se ejecutó el seed de master y se verificó:
- ✅ Módulo "radian" eliminado correctamente
- ✅ Solo existe módulo "electronic_documents" con funcionalidad RADIAN incluida
- ✅ Acciones tienen prefijo correcto: `electronic_documents.radian.*`

## Requisitos

- Extensión `pg_trgm` de PostgreSQL habilitada en la DB master
- Se agregó habilitación automática de pg_trgm en el seed principal (seed.ts)
- Índices GIN creados en campos `module_name` y `module_key` para búsqueda fuzzy óptima

## Cambios adicionales

**Archivo modificado:**
- `contagracia-shared-modules/prisma/seeds/seed.ts`

Se agregó habilitación de extensión pg_trgm e índices GIN al inicio del seed de master:

```typescript
await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_modules_module_name_trgm ON modules USING GIN (module_name gin_trgm_ops)`);
await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_modules_module_key_trgm ON modules USING GIN (module_key gin_trgm_ops)`);
```
