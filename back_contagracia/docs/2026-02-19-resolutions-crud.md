# CRUD de Resoluciones DIAN

**Fecha:** 2026-02-19
**Autor:** Claude Code
**Módulo:** electronic-documents-service (backend), electronic-documents (frontend)

## Resumen

Implementación completa del CRUD de Resoluciones DIAN para facturación electrónica:
- Backend en `electronic-documents-service` con validaciones de negocio
- Frontend en `/electronic-documents/resolutions` con fuzzy search
- Soft delete (desactiva `is_active`, no elimina físicamente)
- Búsqueda fuzzy con pg_trgm para tipos de documento
- Sin decoradores de permisos en backend (validación solo en frontend)

## Cambios en Schema

**NO hubo cambios en schema.** El modelo `Resolution` ya existía con los campos necesarios después del refactor previo (2026-02-19-resolution-schema-refactor.md).

### Índices pg_trgm agregados

Archivo: `contagracia-shared-modules/prisma/scripts/migrate-all-tenants.ts`

```typescript
await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_name_trgm ON "type_documents" USING gin ("name" gin_trgm_ops)`);
await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_code_trgm ON "type_documents" USING gin ("code" gin_trgm_ops)`);
```

**Ejecutado:** ✅ Script migrate-all-tenants aplicó índices en tenant ARAWANA STUDIO SAS

## Backend - electronic-documents-service

### Estructura de archivos

```
electronic-documents-service/src/modules/
├── resolutions/
│   ├── dto/
│   │   ├── create-resolution.dto.ts
│   │   └── update-resolution.dto.ts
│   ├── resolutions.controller.ts
│   ├── resolutions.service.ts
│   └── resolutions.module.ts
└── type-documents/
    ├── type-documents.controller.ts
    ├── type-documents.service.ts
    └── type-documents.module.ts
```

### DTOs

**CreateResolutionDto:**
```typescript
{
  type_document_id: string;        // Obligatorio
  prefix: string;                  // Obligatorio, max 10 caracteres
  resolution_number: string;       // Obligatorio
  resolution_date: string;         // Obligatorio (DateString)
  technical_key?: string;          // Opcional (obligatorio para tipos 1,2,3,12)
  range_from: number;              // Obligatorio, min 1
  range_to: number;                // Obligatorio, min 1
  last_external_consecutive?: number; // Opcional, min 0, default 0
  date_from: string;               // Obligatorio (DateString)
  date_to: string;                 // Obligatorio (DateString)
  is_active?: boolean;             // Opcional, default true
}
```

**UpdateResolutionDto:** `PartialType(CreateResolutionDto)` - todos los campos opcionales

### Endpoints

**Base URL:** `/api/electronic-documents/resolutions`

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| POST | `/` | Crear resolución | `electronic_documents.resolutions.create` |
| GET | `/` | Listar resoluciones | `electronic_documents.resolutions.view` |
| GET | `/:id` | Obtener una resolución | `electronic_documents.resolutions.view` |
| PATCH | `/:id` | Actualizar resolución | `electronic_documents.resolutions.edit` |
| DELETE | `/:id` | Eliminar (soft delete) | `electronic_documents.resolutions.delete` |

**Query params (GET /):**
- `include_inactive`: `"true"` para incluir resoluciones inactivas

### Validaciones de Negocio

**Campos obligatorios:**
- `type_document_id`, `prefix`, `resolution_number`, `resolution_date`
- `range_from`, `range_to`, `date_from`, `date_to`

**Validaciones de rangos:**
1. `range_from > 0` y `range_to > 0`
2. `range_to > range_from`

**Validaciones de consecutivo externo:**
1. `last_external_consecutive >= 0`
2. `last_external_consecutive <= range_to`

**Validaciones de fechas:**
1. `date_from <= date_to`

**Validación de clave técnica:**
- Obligatoria si `type_document.id` es `1`, `2`, `3` o `12`

**NO se valida:**
- ❌ Solapamiento de rangos entre resoluciones (se permite)

### Soft Delete

```typescript
async remove(companyId: string, id: string) {
  // Solo marca como inactiva, NO elimina físicamente
  await tenantDb.resolution.update({
    where: { id },
    data: { is_active: false },
  });
}
```

## Type Documents Endpoint (Fuzzy Search)

### Endpoint

**Base URL:** `/api/electronic-documents/type-documents`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Buscar tipos de documento con fuzzy search |

**Query params:**
- `search`: Término de búsqueda (opcional)
- `page`: Número de página (default: 1)
- `limit`: Resultados por página (default: 20)

### Implementación Fuzzy Search

```typescript
if (search) {
  const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
    SELECT td."id"
    FROM "type_documents" td
    WHERE word_similarity(${search}, COALESCE(td."name", '')) > 0.3
       OR word_similarity(${search}, COALESCE(td."code", '')) > 0.3
  `;

  const matchIds = fuzzyMatches.map((r) => r.id);
  if (matchIds.length > 0) {
    where.id = { in: matchIds };
  }
}

const [data, total] = await Promise.all([
  tenantDb.typeDocument.findMany({ where, skip, take: limit }),
  tenantDb.typeDocument.count({ where }),
]);

return {
  data,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
};
```

**Índices usados:**
- `idx_td_name_trgm` - GIN index en `type_documents.name`
- `idx_td_code_trgm` - GIN index en `type_documents.code`

## Frontend - /electronic-documents/resolutions

### Estructura de archivos

```
front_contagracia/src/
├── app/electronic-documents/resolutions/
│   └── page.tsx                    # Página principal
└── modules/electronic-documents/
    ├── components/
    │   └── ResolutionFormDialog.tsx  # Formulario crear/editar
    └── services/
        └── resolutions.service.ts    # API client
```

### Página principal (page.tsx)

**Ruta:** `/electronic-documents/resolutions`

**Características:**
- Tabla con todas las resoluciones
- Filtro "Mostrar inactivas"
- Botones de acción (Editar, Eliminar) según permisos
- Indicadores visuales de estado (Activa/Inactiva)

**Permisos validados:**
```typescript
const canCreate = can('electronic_documents.resolutions.create');
const canEdit = can('electronic_documents.resolutions.edit');
const canDelete = can('electronic_documents.resolutions.delete');
```

**Columnas mostradas:**
- Estado (Activa/Inactiva con íconos)
- Tipo Documento (nombre + código)
- Prefijo
- Número Resolución
- Rango (desde - hasta) + último externo
- Vigencia (desde - hasta)
- Acciones

### Formulario (ResolutionFormDialog.tsx)

**Características:**
- Dialog modal para crear/editar
- AsyncSearchableSelect para tipos de documento (fuzzy search)
- Input `type="date"` para todas las fechas (4 fechas)
- Validaciones en frontend antes de enviar
- Checkbox para "Resolución Activa"

**Campos:**
1. **Tipo de Documento** - AsyncSearchableSelect con búsqueda fuzzy
2. **Prefijo** - Input text, max 10 caracteres
3. **Número Resolución** - Input text
4. **Fecha Resolución** - Input date
5. **Clave Técnica** - Input text, opcional (hint: obligatorio para facturas)
6. **Consecutivo Desde** - Input number, min 1
7. **Consecutivo Hasta** - Input number, min 1
8. **Último Consecutivo Externo** - Input number, min 0, con descripción
9. **Válida Desde** - Input date
10. **Válida Hasta** - Input date
11. **Resolución Activa** - Checkbox

**Validaciones frontend:**
- Todos los campos obligatorios completos
- Prefijo <= 10 caracteres
- Technical key obligatoria para tipos 1, 2, 3, 12
- range_from > 0, range_to > 0
- range_to > range_from
- last_external_consecutive >= 0
- last_external_consecutive <= range_to
- date_from <= date_to

**AsyncSearchableSelect:**
```typescript
const loadTypeDocuments = async (search: string, page: number) => {
  const response = await electronicDocsClient.get('/type-documents', {
    params: { search, page, limit: 20 },
  });

  const options = response.data.data.map((doc) => ({
    value: doc.id,
    label: doc.name,
    description: `Código: ${doc.code}`,
  }));

  return {
    data: options,
    hasMore: response.data.page < response.data.totalPages,
    total: response.data.total,
  };
};
```

### Service (resolutions.service.ts)

**API Client:** `electronicDocsClient` (puerto 3016)

```typescript
class ResolutionsService {
  async getAll(includeInactive = false): Promise<Resolution[]>
  async getOne(id: string): Promise<Resolution>
  async create(data: CreateResolutionDto): Promise<Resolution>
  async update(id: string, data: UpdateResolutionDto): Promise<Resolution>
  async delete(id: string): Promise<{ message: string }>
}
```

## Permisos

**Módulo:** `electronic_documents`

### Permisos existentes (seeder)

Archivo: `contagracia-shared-modules/prisma/seeds/modules/actions/electronic_documents.ts`

```typescript
{ action_key: 'electronic_documents.resolutions.view', action_name: 'Ver Resoluciones', description: 'Ver resoluciones de facturación' },
{ action_key: 'electronic_documents.resolutions.create', action_name: 'Crear Resolución', description: 'Crear resolución' },
{ action_key: 'electronic_documents.resolutions.edit', action_name: 'Editar Resolución', description: 'Editar resolución' },
{ action_key: 'electronic_documents.resolutions.delete', action_name: 'Eliminar Resolución', description: 'Eliminar (desactivar) resolución' }, // ← Agregado
```

**Seeder ejecutado:** ✅ `seed-all-tenants.ts` - 652 actions creadas

## Decisiones de Arquitectura

### ✅ Por qué electronic-documents-service (NO accounting)?

Las resoluciones DIAN son parte del proceso de **facturación y nómina electrónica**, no de contabilidad general:
- Se registran en DIAN para habilitar facturación electrónica
- Se usan para generar consecutivos de documentos electrónicos
- Están relacionadas con certificados digitales, software DIAN, ambientes (habilitación/producción)
- Coherente con el módulo `electronic_documents` existente

### ✅ Por qué NO validar solapamiento de rangos?

Por solicitud explícita del usuario. Casos de uso válidos:
- Múltiples resoluciones activas para diferentes prefijos
- Resoluciones de prueba y producción simultáneas
- Migración gradual de resoluciones antiguas

### ✅ Por qué soft delete?

- Las resoluciones NO deben eliminarse físicamente (auditoría DIAN)
- Documentos existentes pueden referenciar resoluciones antiguas
- Historial completo de resoluciones usadas
- Cumplimiento normativo

### ✅ Por qué NO usar decoradores @RequirePermission?

Por solicitud del usuario:
- Validaciones de permisos **solo en frontend** con `usePermissions().can()`
- Backend no tiene decoradores de permisos ni audit log
- Más simple y directo
- Frontend controla acceso a funcionalidades

## Testing Manual

### Backend

```bash
# Iniciar servicio
cd electronic-documents-service
pnpm run start:dev

# Crear resolución
curl -X POST http://localhost:3016/api/resolutions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "type_document_id": "uuid-tipo-doc",
    "prefix": "FE",
    "resolution_number": "18760000001",
    "resolution_date": "2024-01-15",
    "technical_key": "abc123...",
    "range_from": 1,
    "range_to": 1000000,
    "last_external_consecutive": 0,
    "date_from": "2024-01-01",
    "date_to": "2026-12-31",
    "is_active": true
  }'

# Listar todas
curl http://localhost:3016/api/resolutions?include_inactive=false \
  -H "Authorization: Bearer {token}"

# Buscar tipos de documento
curl "http://localhost:3016/api/type-documents?search=factura&page=1&limit=20" \
  -H "Authorization: Bearer {token}"

# Desactivar resolución
curl -X DELETE http://localhost:3016/api/resolutions/{id} \
  -H "Authorization: Bearer {token}"
```

### Frontend

1. Navegar a `/electronic-documents/resolutions`
2. Verificar que lista resoluciones existentes
3. Click "Nueva Resolución":
   - Buscar tipo de documento (fuzzy search funciona)
   - Completar todos los campos
   - Usar datepickers para fechas
   - Guardar
4. Verificar validaciones:
   - Campos obligatorios
   - Rangos válidos
   - Fechas válidas
   - Technical key para tipos específicos
5. Editar resolución existente
6. Desactivar resolución (botón eliminar)
7. Mostrar inactivas (checkbox)

## Archivos Modificados/Creados

### Backend

**Creados:**
```
electronic-documents-service/src/modules/resolutions/
  - dto/create-resolution.dto.ts
  - dto/update-resolution.dto.ts
  - resolutions.controller.ts
  - resolutions.service.ts
  - resolutions.module.ts

electronic-documents-service/src/modules/type-documents/
  - type-documents.controller.ts
  - type-documents.service.ts
  - type-documents.module.ts
```

**Modificados:**
```
electronic-documents-service/src/app.module.ts (agregado ResolutionsModule, TypeDocumentsModule)
contagracia-shared-modules/prisma/scripts/migrate-all-tenants.ts (índices pg_trgm)
contagracia-shared-modules/prisma/seeds/modules/actions/electronic_documents.ts (permiso delete)
electronic-documents-service/package.json (dependencias class-validator, class-transformer)
```

### Frontend

**Creados:**
```
front_contagracia/src/app/electronic-documents/resolutions/page.tsx
front_contagracia/src/modules/electronic-documents/services/resolutions.service.ts
front_contagracia/src/modules/electronic-documents/components/ResolutionFormDialog.tsx
```

## Próximos Pasos

1. ⏳ **Actualizar menú lateral** para mostrar link a Resoluciones
2. ⏳ **Integrar con proceso de habilitación DIAN** (Test Sets)
3. ⏳ **Enviar resolución a API DIAN** al crear/actualizar
4. ⏳ **Asignar resolución automática** al generar facturas/documentos
5. ⏳ **Dashboard de uso** de resoluciones (consecutivos disponibles vs usados)

## Referencias

- [Refactor Schema Resoluciones](./2026-02-19-resolution-schema-refactor.md)
- [API Log Enum](./2026-02-19-apilog-enum.md)
- [Fixes Documentos Electrónicos](./2026-02-19-documentos-electronicos-fixes.md)
- Código viejo: `/c/projects/django/contagracia_viejo/frontend/src/components/dashboard/ResolutionForm.jsx`
