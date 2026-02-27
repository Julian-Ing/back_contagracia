# ApiLog Schema Refactor - Enum y limpieza

**Fecha:** 2026-02-19
**Autor:** Claude Code
**Módulo:** contagracia-shared-modules

## Resumen

Refactorización del modelo `ApiLog` para usar enum en lugar de strings libres y eliminar campos redundantes.

## Cambios en Schema

### 1. Nuevo Enum `ApiLogReferenceType`

```prisma
enum ApiLogReferenceType {
  // Facturación Electrónica
  INVOICE
  CREDIT_NOTE
  DEBIT_NOTE

  // Nómina Electrónica
  PAYROLL
  PAYROLL_ADJUST_NOTE

  // Compras
  PURCHASE
  PURCHASE_RETURN

  // Gastos
  EXPENSE
  EXPENSE_RETURN

  // Habilitación (Test Sets)
  INVOICE_HABILITATION
  PAYROLL_HABILITATION
  PAYROLL_ADJUST_NOTE_HABILITATION
}
```

### 2. Cambios en Modelo `ApiLog`

**Antes:**
```prisma
model ApiLog {
  id              String   @id @default(uuid())
  reference_id    String?  @db.Uuid          // ❌ Constraint UUID innecesario
  reference_type  String   @db.VarChar(50)   // ❌ String libre, sin validación
  json_request    Json     @db.JsonB
  json_response   Json?    @db.JsonB
  status_response Boolean  @default(false)
  url_pdf         String?  @db.VarChar(255)
  date_sent       DateTime @default(now()) @db.Timestamptz()
  entity          Int      @default(1)       // ❌ Redundante con reference_type
  created_at      DateTime @default(now()) @db.Timestamptz()
  updated_at      DateTime @updatedAt @db.Timestamptz()

  @@index([reference_id])
  @@index([reference_type])
  @@index([date_sent])
  @@map("apilog")
}
```

**Ahora:**
```prisma
model ApiLog {
  id              String               @id @default(uuid())
  reference_id    String?              // ✅ Sin constraint UUID (más flexible)
  reference_type  ApiLogReferenceType  // ✅ Enum con validación
  json_request    Json                 @db.JsonB
  json_response   Json?                @db.JsonB
  status_response Boolean              @default(false)
  url_pdf         String?              @db.VarChar(255)
  date_sent       DateTime             @default(now()) @db.Timestamptz()
  // ✅ entity eliminado (redundante)
  created_at      DateTime             @default(now()) @db.Timestamptz()
  updated_at      DateTime             @updatedAt @db.Timestamptz()

  @@index([reference_id])
  @@index([reference_type])
  @@index([date_sent])
  @@map("apilog")
}
```

## Justificación de Cambios

### ✅ `reference_type` como Enum

**Problema anterior:**
- String libre sin validación
- Valores inconsistentes ("payroll_habilitation" vs "PAYROLL_HABILITATION")
- No hay autocomplete en el código
- Errores de typos en runtime

**Solución:**
- Enum con valores predefinidos
- TypeScript autocomplete
- Validación en tiempo de compilación
- Consistencia garantizada

### ✅ Eliminar `@db.Uuid` de `reference_id`

**Problema anterior:**
- `reference_id` con constraint UUID en PostgreSQL
- Inflexible si necesitamos IDs no-UUID

**Solución:**
- `reference_id` como String nullable sin constraint
- Más flexible para diferentes tipos de IDs
- Mantiene la relación lógica sin restricción de formato

**Uso:**
- `reference_id = null` → Para logs de habilitación (no hay documento real)
- `reference_id = "uuid-string"` → Para documentos reales

### ✅ Eliminar campo `entity`

**Problema anterior:**
- Campo `entity` (Int) era redundante con `reference_type`
- Mapeo manual necesario (1=factura, 9=nómina, 10=nota ajuste)
- Información duplicada

**Solución:**
- `reference_type` enum ya indica el tipo de documento
- No necesitamos campo adicional
- Simplifica el modelo

**Antes:**
```typescript
// Necesitabas consultar ambos campos
if (log.entity === 1) { /* factura */ }
if (log.reference_type === "invoice") { /* también factura */ }
```

**Ahora:**
```typescript
// Un solo campo con toda la información
if (log.reference_type === ApiLogReferenceType.INVOICE) { /* factura */ }
```

## Valores Eliminados del Enum

Durante el análisis del código viejo, se identificaron estos valores que NO se agregaron al enum:

- `PAYMENT_RECEIPT` - Manejo interno de contabilidad, no requiere log DIAN
- `PAYMENT_RECEIPT_VOID` - Manejo interno de contabilidad, no requiere log DIAN
- `TRAVEL_EXPENSE_ADVANCE` - Manejo interno de contabilidad, no requiere log DIAN

**Justificación:** ApiLog es específico para logging de comunicación con DIAN y APIs externas de documentos electrónicos. Los movimientos internos no necesitan ser registrados aquí.

## Uso del Modelo

### Crear log de documento real

```typescript
await prisma.apiLog.create({
  data: {
    reference_id: invoice.id,
    reference_type: ApiLogReferenceType.INVOICE,
    json_request: requestPayload,
    json_response: dianResponse,
    status_response: true,
    url_pdf: pdfUrl,
  },
});
```

### Crear log de habilitación (sin documento)

```typescript
await prisma.apiLog.create({
  data: {
    reference_id: null, // Sin documento asociado
    reference_type: ApiLogReferenceType.PAYROLL_HABILITATION,
    json_request: testPayload,
    json_response: dianResponse,
    status_response: true,
  },
});
```

### Consultar logs por tipo

```typescript
const payrollLogs = await prisma.apiLog.findMany({
  where: {
    reference_type: ApiLogReferenceType.PAYROLL,
  },
});
```

## Migración

**Script usado:** `prisma/scripts/migrate-all-tenants.ts`

**Tenants migrados:**
- ✅ ARAWANA STUDIO SAS (tenant_dani_ml2odb2h)

**Comandos ejecutados:**
```bash
# 1. Modificar schema-tenant.prisma
# 2. Aplicar migración a todos los tenants
npx ts-node prisma/scripts/migrate-all-tenants.ts

# 3. Generar clientes Prisma
npx prisma generate --schema=prisma/schema-tenant.prisma
npx prisma generate --schema=prisma/schema-master.prisma

# 4. Build shared-modules
pnpm run build:all

# 5. Actualizar workspace
pnpm install
```

## Impacto

### ✅ Beneficios

1. **Type Safety:** Errores de typo capturados en compilación
2. **Autocomplete:** IDE sugiere valores válidos
3. **Consistencia:** Imposible usar valores incorrectos
4. **Simplicidad:** Un solo campo en lugar de dos
5. **Flexibilidad:** `reference_id` sin restricciones innecesarias

### ⚠️ Breaking Changes

**Código que debe actualizarse:**

```typescript
// ❌ Antes (no funcionará)
reference_type: "invoice"
entity: 1

// ✅ Ahora
reference_type: ApiLogReferenceType.INVOICE
// entity eliminado
```

**Servicios afectados:**
- electronic-documents-service (cuando se implemente habilitación)
- invoicing-service (futuro)
- payroll-service (futuro)

## Referencias

- Schema: `contagracia-shared-modules/prisma/schema-tenant.prisma`
- Código viejo: `/c/projects/django/contagracia_viejo/frontend/src/components/company-profile/PayrollConfigCard.jsx`
- Análisis de habilitación: Conversation thread 2026-02-19

## Próximos Pasos

1. ✅ Schema actualizado
2. ✅ Migración aplicada
3. ⏳ Implementar servicio de Resoluciones (prioridad)
4. ⏳ Implementar proceso de habilitación (usa ApiLog)
5. ⏳ Crear helpers para logging en shared-modules
