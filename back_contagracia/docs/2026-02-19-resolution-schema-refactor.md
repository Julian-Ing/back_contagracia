# Resolution Schema Refactor

**Fecha:** 2026-02-19
**Autor:** Claude Code
**Módulo:** contagracia-shared-modules

## Resumen

Refactorización del modelo `Resolution` para alinearlo con el sistema viejo y prepararlo para el módulo CRUD de Resoluciones:
1. Renombrar `resolution` → `resolution_number` (sin límite VARCHAR)
2. Eliminar campo `generated_to_date` (redundante)
3. Agregar campo `last_external_consecutive` (tracking externo)

## Cambios en Schema

### Antes

```prisma
model Resolution {
  id                String    @id @default(uuid())
  type_document_id  String
  prefix            String    @db.VarChar(10)
  resolution        String    @db.VarChar(50)  // ❌ Nombre confuso + límite VARCHAR
  resolution_date   DateTime  @db.Date
  technical_key     String?
  range_from        BigInt
  range_to          BigInt
  generated_to_date Int       @default(0)      // ❌ Redundante (se elimina)
  date_from         DateTime? @db.Date
  date_to           DateTime? @db.Date

  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  type_document  TypeDocument   @relation(fields: [type_document_id], references: [id])
  documents      Document[]
  cash_registers CashRegister[]

  @@index([type_document_id])
  @@index([is_active])
  @@map("resolutions")
}
```

### Ahora

```prisma
model Resolution {
  id                        String    @id @default(uuid())
  type_document_id          String
  prefix                    String    @db.VarChar(10)
  resolution_number         String                          // ✅ Nombre claro, sin límite
  resolution_date           DateTime  @db.Date
  technical_key             String?
  range_from                BigInt
  range_to                  BigInt
  last_external_consecutive Int?      @default(0)           // ✅ Tracking externo agregado
  date_from                 DateTime? @db.Date
  date_to                   DateTime? @db.Date

  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  type_document  TypeDocument   @relation(fields: [type_document_id], references: [id])
  documents      Document[]
  cash_registers CashRegister[]

  @@index([type_document_id])
  @@index([is_active])
  @@map("resolutions")
}
```

## Justificación de Cambios

### ✅ `resolution` → `resolution_number`

**Problema anterior:**
- Nombre genérico y confuso con el modelo mismo
- Límite `VARCHAR(50)` innecesario que podría truncar números de resolución largos
- No refleja claramente que es el número de resolución de DIAN

**Solución:**
- `resolution_number` es más descriptivo
- Sin límite `VARCHAR` - String sin restricción en Prisma
- Alineado con nomenclatura del sistema

**Ejemplo:**
```typescript
// Antes
resolution: "18760000001234567890123456789012345678901234567890" // Truncado!

// Ahora
resolution_number: "18760000001234567890123456789012345678901234567890" // Sin límite
```

### ✅ Eliminar `generated_to_date`

**Problema anterior:**
- Campo `generated_to_date` (Int) para trackear consecutivos generados localmente
- Redundante porque podemos calcularlo en tiempo real desde la tabla `documents`
- Al registrar resolución nueva en DIAN, siempre se envía `generated_to_date: 0`
- No se necesita persistir este valor

**Solución:**
- Eliminar el campo del schema
- Calcular en tiempo real cuando se necesite:
  ```typescript
  const generatedCount = await prisma.document.count({
    where: { resolution_id: resolutionId }
  });
  ```

**Ventajas:**
- Un campo menos que mantener sincronizado
- Evita inconsistencias entre `generated_to_date` y conteo real de documentos
- Source of truth único (tabla `documents`)

### ✅ Agregar `last_external_consecutive`

**Problema anterior:**
- No existía forma de trackear consecutivos usados externamente
- Al migrar desde otro sistema, no se podía continuar numeración existente
- Casos de uso:
  - Migración desde sistema viejo
  - Documentos emitidos manualmente antes de implementar software
  - Sincronización con otros sistemas

**Solución:**
- Campo `last_external_consecutive Int? @default(0)`
- Inicializado en `range_from - 1` para resoluciones nuevas
- Actualizable manualmente si hay consecutivos pre-existentes

**Uso en sistema viejo:**
```typescript
// Al registrar resolución nueva
await supabase.from("resolutions").insert({
  ...
  range_from: 1000,
  range_to: 5000,
  last_external_consecutive: 999,  // = range_from - 1
});

// Si ya se usaron algunos consecutivos externamente
await supabase.from("resolutions").insert({
  ...
  range_from: 1000,
  range_to: 5000,
  last_external_consecutive: 1050,  // Ya se usaron del 1000 al 1050
});
```

**Uso en nuevo sistema:**
```typescript
// Resolución nueva (sin uso previo)
await prisma.resolution.create({
  data: {
    resolution_number: "18760000001",
    range_from: 1000n,
    range_to: 5000n,
    last_external_consecutive: 999,  // Siguiente disponible: 1000
  }
});

// Resolución con consecutivos ya usados
await prisma.resolution.create({
  data: {
    resolution_number: "18760000001",
    range_from: 1000n,
    range_to: 5000n,
    last_external_consecutive: 1050,  // Siguiente disponible: 1051
  }
});

// Calcular siguiente consecutivo disponible
const nextConsecutive = resolution.last_external_consecutive + 1;
```

## Comparativa Final: Viejo vs Nuevo

| Campo | Sistema Viejo | Sistema Nuevo | Cambio |
|-------|--------------|---------------|--------|
| ID | `id` (auto) | `id` (UUID) | ✅ Igual |
| Company | `company_id` | N/A | ⚠️ Removido (multi-tenant) |
| Tipo Documento | `type_document_id` (FK) | `type_document_id` (FK) | ✅ Igual |
| Prefijo | `prefix` | `prefix` | ✅ Igual |
| Número Resolución | `resolution` (VARCHAR 50) | `resolution_number` (String sin límite) | ✅ Mejorado |
| Fecha Resolución | `resolution_date` | `resolution_date` | ✅ Igual |
| Clave Técnica | `technical_key` | `technical_key` | ✅ Igual |
| Rango Desde | `range_from` | `range_from` | ✅ Igual |
| Rango Hasta | `range_to` | `range_to` | ✅ Igual |
| Generados Hasta | `generated_to_date` | ❌ **Eliminado** | ✅ Se calcula en runtime |
| Último Externo | `last_external_consecutive` | `last_external_consecutive` | ✅ **Agregado** |
| Fecha Desde | `date_from` | `date_from` | ✅ Igual |
| Fecha Hasta | `date_to` | `date_to` | ✅ Igual |
| Activo | `active` (int) | `is_active` (boolean) | ✅ Igual concepto |
| Timestamps | N/A | `created_at`, `updated_at` | ℹ️ Auto en Prisma |

## Relación con TypeDocument

```prisma
model TypeDocument {
  id             String   @id @default(uuid())
  code           String   @unique
  name           String
  cufe_algorithm String?
  prefix         String?
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())

  resolutions Resolution[]  // ← Relación 1:N con Resolution

  @@map("type_documents")
}
```

**Tipos de documentos comunes:**
- Factura Electrónica (código `01`)
- Nota Crédito (código `91`)
- Nota Débito (código `92`)
- Nómina Electrónica (código `102`)
- Nota Ajuste Nómina (código `103`)

## Payload a DIAN API

Al registrar una resolución nueva en DIAN:

```typescript
const body = {
  type_document_id: resolution.type_document.id,
  prefix: resolution.prefix,
  resolution: resolution.resolution_number,
  resolution_date: resolution.resolution_date,
  technical_key: resolution.technical_key,
  from: Number(resolution.range_from),
  to: Number(resolution.range_to),
  generated_to_date: 0,  // ← Siempre 0 al registrar (sin docs generados aún)
  date_from: resolution.date_from,
  date_to: resolution.date_to,
};

const response = await dianApiService.post('/api/ubl2.1/config/resolution', body);
```

**Nota:** El campo `generated_to_date` en el payload DIAN es diferente del campo local (eliminado). Siempre enviamos `0` al registrar porque no hemos generado documentos aún.

## Migración

**Script usado:** `prisma/scripts/migrate-all-tenants.ts`

**Tenants migrados:**
- ✅ ARAWANA STUDIO SAS (tenant_dani_ml2odb2h)

**Comandos ejecutados:**
```bash
# 1. Modificar schema-tenant.prisma
# 2. Aplicar migración a todos los tenants
echo "y" | npx ts-node prisma/scripts/migrate-all-tenants.ts

# 3. Generar clientes Prisma
npx prisma generate --schema=prisma/schema-tenant.prisma
npx prisma generate --schema=prisma/schema-master.prisma

# 4. Build shared-modules
pnpm run build:all

# 5. Actualizar workspace
pnpm install
```

**Resultado:**
```
✅ Successful: 1
❌ Failed: 0
✅ Migration process completed
```

## Impacto

### ✅ Beneficios

1. **Nomenclatura Clara:** `resolution_number` es más descriptivo que `resolution`
2. **Sin Límites Artificiales:** String sin VARCHAR permite números de resolución largos
3. **Tracking Externo:** `last_external_consecutive` permite migración y casos edge
4. **Menos Redundancia:** Eliminar `generated_to_date` simplifica el modelo
5. **Alineado con Sistema Viejo:** Compatible con lógica existente

### ⚠️ Breaking Changes

**Código que debe actualizarse:**

```typescript
// ❌ Antes
resolution.resolution
resolution.generated_to_date

// ✅ Ahora
resolution.resolution_number
// generated_to_date se calcula:
const generated = await prisma.document.count({
  where: { resolution_id: resolution.id }
});
```

**Servicios que requieren actualización:**
- `accounting-service` (cuando se implemente módulo CRUD de Resoluciones)
- `electronic-documents-service` (registro de resoluciones en DIAN)
- Cualquier servicio que consulte o cree resoluciones

## Próximos Pasos

1. ✅ Schema actualizado
2. ✅ Migración aplicada
3. ⏳ **Implementar módulo CRUD de Resoluciones** (prioridad alta)
   - Controller: GET, POST, PATCH, DELETE endpoints
   - Service: Validación de rangos, fechas, solapamientos
   - DTOs: CreateResolutionDto, UpdateResolutionDto
   - Validadores: Rango disponible, fechas válidas, resolución única
4. ⏳ Integrar registro de resoluciones con DIAN API
5. ⏳ Frontend: Página de gestión de resoluciones
6. ⏳ Implementar proceso de habilitación (Test Sets)

## Referencias

- Schema: `contagracia-shared-modules/prisma/schema-tenant.prisma`
- Sistema viejo: `/c/projects/django/contagracia_viejo/frontend/src/components/company-profile/PayrollConfigCard.jsx`
- API DIAN: `contagracia-shared-modules/shared-dian/src/dian-api.service.ts`
- Documento ApiLog: `docs/2026-02-19-apilog-enum.md`
