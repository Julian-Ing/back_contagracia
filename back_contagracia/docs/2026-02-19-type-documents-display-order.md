# Type Documents - Campo display_order

**Fecha:** 2026-02-19
**Autor:** Claude Code
**Módulo:** contagracia-shared-modules, electronic-documents-service

## Problema

Al ordenar `type_documents` por `id` (campo String UUID), el ordenamiento era lexicográfico en lugar de numérico:
- Orden lexicográfico incorrecto: `'1', '10', '11', '12', ... '19', '2', '20', '21', ... '26', '3', '4', ...`
- Orden esperado: `1, 2, 3, 4, 5, ... 9, 10, 11, 12, ...`

Esto causaba que "Nomina Individual de Ajuste" (ID '10') apareciera antes que documentos con IDs '2', '3', etc.

## Solución

Se agregó campo `display_order Int?` para mantener orden lógico sin cambiar el tipo del campo `id`.

## Cambios en Schema

### schema-tenant.prisma y schema-master.prisma

```prisma
model TypeDocument {
  id             String   @id @default(uuid())
  code           String   @unique
  name           String
  cufe_algorithm String?
  prefix         String?
  display_order  Int?     // ← Campo agregado
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())

  resolutions Resolution[]
  @@map("type_documents")
}
```

## Cambios en Seeds

### typeDocuments.ts

Agregado `display_order` e `is_active`:

```typescript
export const typeDocuments = [
  { id: '1', code: '01', name: 'Factura de Venta Nacional', cufe_algorithm: 'CUFE-SHA384', prefix: 'fv', display_order: 1, is_active: true },
  { id: '2', code: '02', name: 'Factura de Exportación', cufe_algorithm: 'CUFE-SHA384', prefix: 'fv', display_order: 2, is_active: true },
  // ... (26 elementos total, display_order 1-26)
];
```

### seed-all-tenants.ts

**Cambio 1:** Importar desde archivo en lugar de leer de master

```typescript
import { typeDocuments as typeDocumentsSeed } from '../seeds/typeDocuments';

// En Promise.all:
Promise.resolve(typeDocumentsSeed), // Antes: masterPrisma.typeDocument.findMany()
```

**Cambio 2:** Actualizar upsert con display_order

```typescript
await tenantPrisma.typeDocument.upsert({
  where: { code: item.code },
  update: { name: item.name, cufe_algorithm: item.cufe_algorithm, prefix: item.prefix, display_order: item.display_order, is_active: item.is_active },
  create: { id: item.id, code: item.code, name: item.name, cufe_algorithm: item.cufe_algorithm, prefix: item.prefix, display_order: item.display_order, is_active: item.is_active },
});
```

## Cambios en Servicios Backend

### AppModule (electronic-documents-service)

Importado `DianApiModule` para habilitar inyección de dependencias:

```typescript
import {
  AuthModule,
  TenantContextModule,
  TenantContextService,
  TENANT_CONTEXT_SERVICE,
  DianApiModule, // ← Agregado
} from '@contagracia/shared-modules';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TenantContextModule.forRoot({ masterDatabaseUrl: process.env.DATABASE_MASTER_URL! }),
    DianApiModule, // ← Agregado (Global module)
    AuthModule.forRoot(),
    // ... otros módulos
  ],
})
export class AppModule {}
```

**Nota:** `DianApiModule` es marcado como `@Global()` en su definición, por lo que al importarlo una vez en AppModule queda disponible para todos los módulos.

### DianApiService (contagracia-shared-modules)

**Helper method `makeRequest`:**

Agregado método privado para estandarizar llamadas a API DIAN:

```typescript
private async makeRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
  token?: string,
): Promise<{ success: boolean; data?: T; message?: string; status?: number }> {
  const url = `${this.apiUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { method, headers, ...(body && { body: JSON.stringify(body) }) });
    const responseData = await response.json();

    if (!response.ok) {
      this.logger.error(`Error API DIAN ${method} ${endpoint} (${response.status}): ${JSON.stringify(responseData)}`);
      return { success: false, message: responseData.message || `Error ${response.status}: ${response.statusText}`, status: response.status };
    }

    return { success: responseData.success !== false, data: responseData, message: responseData.message, status: response.status };
  } catch (error: any) {
    this.logger.error(`Error en request a API DIAN ${method} ${endpoint}: ${error.message}`);
    return { success: false, message: error.message };
  }
}
```

**Método `syncResolution`:**

Sincroniza resolución con API DIAN usando el helper:

```typescript
async syncResolution(
  token: string,
  resolutionData: {
    type_document_id: number;
    prefix: string;
    resolution: string;
    resolution_date: string;
    technical_key: string;
    from: number;
    to: number;
    date_from: string;
    date_to: string;
  },
): Promise<{ success: boolean; message?: string }> {
  const body = { ...resolutionData, generated_to_date: 0 };

  this.logger.log(`Enviando resolución a API DIAN: ${resolutionData.prefix} - ${resolutionData.resolution}`);

  const result = await this.makeRequest('/api/ubl2.1/config/resolution', 'PUT', body, token);

  if (result.success) {
    this.logger.log(`Resolución sincronizada con DIAN: ${resolutionData.prefix}`);
  } else {
    this.logger.error(`Error sincronizando resolución con DIAN: ${result.message}`);
  }

  return { success: result.success, message: result.message };
}
```

### type-documents.service.ts

```typescript
orderBy: { display_order: 'asc' } // Antes: { id: 'asc' }
```

### resolutions.service.ts

**Agregados parámetros de filtrado y búsqueda fuzzy:**

```typescript
async findAll(
  companyId: string,
  search?: string,           // Búsqueda fuzzy por prefix/resolution_number
  typeDocumentId?: string,   // Filtro por tipo de documento
  isActive?: boolean,        // undefined = todos, true = activos, false = inactivos
  page = 1,
  limit = 20,
) {
  // Búsqueda fuzzy con pg_trgm
  if (search && search.trim()) {
    const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
      SELECT r."id" FROM "resolutions" r
      WHERE word_similarity(${search}, COALESCE(r."prefix", '')) > 0.3
         OR word_similarity(${search}, COALESCE(r."resolution_number", '')) > 0.3
    `;
    // ...
  }

  return { data, total, page, limit, totalPages };
}
```

**Integración con API DIAN:**

Inyectado `DianApiService` para sincronizar resoluciones:

```typescript
constructor(
  private readonly tenantContext: TenantContextService,
  private readonly dianApiService: DianApiService, // ← Agregado
) {}
```

Llamada a sincronización después de `create` y `update`:

```typescript
// En create() después de crear la resolución
await this.syncWithDian(companyId, resolution, tenantDb);

// En update() después de actualizar la resolución
await this.syncWithDian(companyId, updated, tenantDb);
```

Implementación de `syncWithDian`:

```typescript
private async syncWithDian(companyId: string, resolution: any, tenantDb: any) {
  try {
    // Obtener token DIAN de CompanySetting (tenant DB)
    const setting = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'api_dian_token' },
    });

    const token = setting?.value;

    if (!token) {
      // No hay token, no sincronizar (empresa sin facturación electrónica activa)
      return;
    }

    // Preparar payload para API DIAN
    const payload = {
      type_document_id: Number(resolution.type_document.id),
      prefix: resolution.prefix,
      resolution: resolution.resolution_number,
      resolution_date: resolution.resolution_date.toISOString().split('T')[0],
      technical_key: resolution.technical_key || '',
      from: Number(resolution.range_from),
      to: Number(resolution.range_to),
      date_from: resolution.date_from.toISOString().split('T')[0],
      date_to: resolution.date_to.toISOString().split('T')[0],
    };

    // Enviar a API DIAN (PUT /api/ubl2.1/config/resolution)
    await this.dianApiService.syncResolution(token, payload);
  } catch (error: any) {
    // No bloquear el flujo principal si falla la sincronización con DIAN
    console.error(`Error sincronizando resolución ${resolution.id} con DIAN:`, error.message);
  }
}
```

### resolutions.controller.ts

```typescript
@Get()
findAll(
  @CompanyId() companyId: string,
  @Query('search') search?: string,
  @Query('type_document_id') typeDocumentId?: string,
  @Query('is_active') isActive?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
  return this.resolutionsService.findAll(companyId, search, typeDocumentId, isActiveBool, pageNum, limitNum);
}
```

## Cambios en Frontend

### ResolutionsTab.tsx

**Agregados filtros:**
- Input de búsqueda fuzzy (prefijo, número de resolución)
- SearchableSelect para tipo de documento
- SearchableSelect para estado (Todos, Solo activas, Solo inactivas)

```typescript
const [search, setSearch] = useState('');
const [typeDocumentId, setTypeDocumentId] = useState<string>('');
const [isActive, setIsActive] = useState<string>('all');

// Load con filtros
const data = await resolutionsService.getAll(search, typeDocumentId || undefined, isActive);
```

**UI:**
```tsx
<Input placeholder="Prefijo, número..." value={search} onChange={(e) => setSearch(e.target.value)} />
<SearchableSelect options={typeDocumentOptions} value={typeDocumentId} onChange={setTypeDocumentId} />
<SearchableSelect options={[{value:'all',label:'Todos'},{value:'active',label:'Solo activas'},...]} />
```

### ResolutionFormDialog.tsx

**Cambios:**
1. **DatePicker** en lugar de `<Input type="date">` para todos los campos de fecha
2. **Switch** (toggle) en lugar de checkbox para `is_active`

```tsx
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Switch } from '@/shared/components/ui/switch';

// Fecha Resolución
<DatePicker value={formData.resolution_date} onChange={(value) => handleChange('resolution_date', value)} />

// Fechas de Validez
<DatePicker value={formData.date_from} onChange={(value) => handleChange('date_from', value)} />
<DatePicker value={formData.date_to} onChange={(value) => handleChange('date_to', value)} />

// Toggle Switch
<div className="flex items-center gap-3">
  <Label htmlFor="is_active">Resolución Activa</Label>
  <Switch checked={formData.is_active} onCheckedChange={(checked) => handleChange('is_active', checked)} />
</div>
```

### resolutions.service.ts (frontend)

```typescript
async getAll(search?: string, typeDocumentId?: string, isActive?: string): Promise<Resolution[]> {
  const params: any = {};
  if (search) params.search = search;
  if (typeDocumentId) params.type_document_id = typeDocumentId;
  if (isActive === 'active') params.is_active = 'true';
  if (isActive === 'inactive') params.is_active = 'false';

  const response = await electronicDocsClient.get('/resolutions', { params });
  return response.data.data; // Backend retorna { data, total, page, limit, totalPages }
}
```

## Migración Ejecutada

```bash
# Generado Prisma clients
npx prisma generate --schema=prisma/schema-tenant.prisma
npx prisma generate --schema=prisma/schema-master.prisma

# Migración de schema
npx ts-node prisma/scripts/migrate-all-tenants.ts

# Seeder con display_order
npx ts-node prisma/scripts/seed-all-tenants.ts

# Compilar módulos compartidos
cd contagracia-shared-modules
pnpm build:all
cd shared-dian && npx tsc

# Reinstalar dependencias para actualizar symlinks
cd .. && pnpm install
```

**Resultado:** 26 type documents con display_order 1-26

**Nota importante:** Al modificar archivos en `shared-dian` (compila in-place), es necesario:
1. Borrar archivos `.js` y `.d.ts` compilados viejos si existen
2. Ejecutar `npx tsc` en el directorio `shared-dian`
3. Reiniciar servicios para que tomen los cambios

## Archivos Modificados

### Backend - contagracia-shared-modules
- `prisma/schema-tenant.prisma` - campo display_order
- `prisma/schema-master.prisma` - campo display_order
- `prisma/seeds/typeDocuments.ts` - display_order + is_active
- `prisma/scripts/seed-all-tenants.ts` - importar seed file

### Backend - electronic-documents-service
- `src/app.module.ts` - importado DianApiModule
- `src/modules/type-documents/type-documents.service.ts` - orderBy display_order
- `src/modules/resolutions/resolutions.service.ts` - filtros + fuzzy search + DIAN integration
- `src/modules/resolutions/resolutions.controller.ts` - query params

### Frontend
- `src/app/dashboard/company-profile/components/ResolutionsTab.tsx` - filtros UI
- `src/modules/electronic-documents/components/ResolutionFormDialog.tsx` - DatePicker + Switch
- `src/modules/electronic-documents/services/resolutions.service.ts` - parámetros filtros

## Troubleshooting

### Problema: syncResolution is not a function

**Síntoma:** Al editar/crear resoluciones, error `this.dianApiService.syncResolution is not a function`

**Causa:** Archivos `.js` y `.d.ts` compilados desactualizados en `shared-dian/src/`

**Solución:**
```bash
# 1. Borrar archivos compilados viejos
rm -rf contagracia-shared-modules/shared-dian/src/*.js
rm -rf contagracia-shared-modules/shared-dian/src/*.d.ts
rm -rf contagracia-shared-modules/dist/shared-dian

# 2. Recompilar
cd contagracia-shared-modules/shared-dian
npx tsc

# 3. Reinstalar y reiniciar
cd ../..
pnpm install
# Reiniciar servicios
```

**Verificación:** Log debe mostrar `syncResolution` en métodos disponibles

## Logs de Debugging

Se agregaron logs detallados en `ResolutionsService.syncWithDian()` y `DianApiService.syncResolution()`:

- 🔄 Inicio de sincronización
- 🔍 Métodos disponibles en dianApiService (para debugging)
- 🔑 Token DIAN encontrado/no encontrado
- 📞 Antes de llamar al API
- 📤 Payload enviado a API DIAN
- 📥 Respuesta de API DIAN
- ✅ Completado exitosamente
- ❌ Error con stack trace

Estos logs se mantienen para debugging futuro.

## Referencias

- [CRUD Resoluciones DIAN](./2026-02-19-resolutions-crud.md)
