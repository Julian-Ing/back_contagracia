# Registro de Empresa y Tenant - 2026-01-29

## Resumen
Se implementaron mejoras en el flujo de registro de empresas, incluyendo validación de NIT, provisioning de tenant y verificación de duplicados.

## Cambios Realizados

### 1. Validación de NIT (register-company.dto.ts)
**Antes:**
```typescript
@Matches(/^\d{9,10}$/, { message: 'NIT debe ser de 9 o 10 dígitos' })
nit: string;
```

**Después:**
```typescript
@Matches(/^\d{4,15}$/, { message: 'NIT debe ser de 4 a 15 dígitos' })
nit: string;
```

**Razón:** Soportar NITs de diferentes longitudes según el tipo de empresa.

### 2. Verificación de NIT Duplicado (companies.controller.ts, companies.service.ts)
Se agregó endpoint para verificar si un NIT ya está registrado:

```typescript
// GET /api/companies/check-nit/:nit
@Get('check-nit/:nit')
async checkNit(@Param('nit') nit: string) {
  return this.companiesService.checkNitExists(nit);
}
```

**Respuesta:**
```json
{
  "exists": true|false,
  "message": "Este NIT ya está registrado" // solo si exists=true
}
```

### 3. Email Verificado en Registro (companies.service.ts)
**Antes:**
```typescript
email_verified: false
```

**Después:**
```typescript
email_verified: true
```

**Razón:** El email ya fue verificado via OTP antes de llegar al registro, por lo que debe marcarse como verificado.

### 4. Provisioning de Tenant (tenant.service.ts)
Se corrigieron los métodos de provisioning para usar correctamente los datos de la empresa:

- `createTenantDatabase(companyId)` - Crea la base de datos del tenant usando `company.db_name`
- `runTenantMigrations(companyId)` - Ejecuta migraciones en el tenant
- `replicateParametrics(companyId)` - Replica tablas paramétricas del master al tenant
- `createOwnerTenantUser(companyId, userData)` - Crea el usuario owner en el tenant

**Cambio importante:** Todos los métodos ahora reciben `companyId` y obtienen los datos de conexión desde la tabla `company`.

### 5. Schema Tenant - ProductUnit (schema-tenant.prisma)
Se removió el campo `code` del modelo `ProductUnit` para coincidir con el schema master:

```prisma
model ProductUnit {
  id          String @id @default(uuid())
  name        String
  symbol      String?
  description String?
  is_active   Boolean @default(true)
  created_at  DateTime @default(now())
  products    Product[]
  @@map("product_units")
}
```

## Flujo de Registro Completo

1. **Frontend verifica email** via OTP (auth-service)
2. **Frontend consulta NIT** en DIAN y verifica que no esté duplicado
3. **Frontend envía registro** con `registration_token`
4. **company-service valida** token y datos
5. **Crea en Master:**
   - Usuario owner (`email_verified: true`)
   - Empresa con datos de conexión tenant
   - Relación user_company
   - Suscripción con plan trial
6. **Provisiona Tenant:**
   - Crea base de datos
   - Ejecuta migraciones
   - Replica paramétricas
   - Crea usuario owner en tenant

## Archivos Modificados
- `src/modules/companies/dto/register-company.dto.ts`
- `src/modules/companies/companies.controller.ts`
- `src/modules/companies/companies.service.ts`
- `src/modules/tenant/tenant.service.ts`

## Dependencias
- `contagracia-shared-modules/prisma/schema-tenant.prisma`
