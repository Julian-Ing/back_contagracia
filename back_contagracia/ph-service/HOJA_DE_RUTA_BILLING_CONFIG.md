# Hoja de Ruta: Billing Config CRUD (Interes, Descuento, Recargo)

## Contexto

La pestana "Configuracion" en `/dashboard/ph/billing` es un placeholder.
El proyecto anterior tenia CRUD funcional para configuraciones de facturacion:
interes por mora, descuento pronto pago y recargos.

**Objetivo:** Implementar CRUD completo + UI funcional.
**NO incluye:** Calculo automatico de intereses ni aplicacion de descuentos/recargos (queda para despues).

---

## Paso 1 — Schema Prisma ✅

**Archivo:** `contagracia-shared-modules/prisma/schema-tenant.prisma`

### Modelo `PhBillingConfig`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| condominium_id | FK → PhCondominium | Cascade delete |
| config_type | String | `'interest'` / `'discount'` / `'surcharge'` |
| name | String | Ej: "Interes mora mensual" |
| description | String? | |
| value_type | String (default "percentage") | `'percentage'` / `'fixed_amount'` |
| value | Decimal(15,4) | Ej: 1.5 para 1.5% |
| calculation_period | String? | `'daily'` / `'monthly'` / `'annual'` (solo interes) |
| grace_days | Int (default 0) | Dias de gracia |
| is_compound | Boolean (default false) | Interes compuesto |
| max_percentage | Decimal(5,2)? | Limite % maximo |
| max_amount | Decimal(15,2)? | Limite $ maximo |
| effective_from | DateTime | Fecha inicio vigencia |
| effective_to | DateTime? | null = indefinido |
| applies_to_all_concepts | Boolean (default true) | Si false → usa tabla puente |
| is_active | Boolean (default true) | |
| created_at | DateTime | auto |
| updated_at | DateTime | auto |
| created_by | String? | |

Indices: `[condominium_id]`, `[config_type]`
Mapa: `ph_billing_configs`

### Modelo `PhBillingConfigConcept` (tabla puente M:N)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID PK | |
| billing_config_id | FK → PhBillingConfig | Cascade delete |
| fee_concept_id | FK → PhFeeConcept | Cascade delete |
| created_at | DateTime | auto |

Unique: `[billing_config_id, fee_concept_id]`
Mapa: `ph_billing_config_concepts`

### Relaciones inversas a agregar

- En `PhCondominium`: `billing_configs PhBillingConfig[]`
- En `PhFeeConcept`: `billing_config_associations PhBillingConfigConcept[]`

### Comandos de regeneracion

```bash
cd contagracia-shared-modules && pnpm prisma:generate
cd .. && pnpm install
npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force
```

---

## Paso 2 — Backend: DTOs ✅

### `ph-service/src/modules/billing/dto/create-billing-config.dto.ts` (CREAR)

| Campo | Validacion | Requerido |
|-------|-----------|-----------|
| condominium_id | IsString, IsNotEmpty | Si |
| config_type | IsIn(['interest','discount','surcharge']) | Si |
| name | IsString, IsNotEmpty | Si |
| description | IsString | No |
| value_type | IsIn(['percentage','fixed_amount']) | Si |
| value | IsNumber, Min(0) | Si |
| calculation_period | IsIn(['daily','monthly','annual']) | No |
| grace_days | IsNumber, Min(0) | No |
| is_compound | IsBoolean | No |
| max_percentage | IsNumber | No |
| max_amount | IsNumber | No |
| effective_from | IsDateString | Si |
| effective_to | IsDateString | No |
| applies_to_all_concepts | IsBoolean | No |
| fee_concept_ids | IsArray, IsString(each) | No |
| is_active | IsBoolean | No |

### `ph-service/src/modules/billing/dto/update-billing-config.dto.ts` (CREAR)

Igual pero todo opcional. **Sin** `condominium_id` ni `config_type` (inmutables).

---

## Paso 3 — Backend: Service ✅

**Archivo:** `ph-service/src/modules/billing/billing.service.ts` (MODIFICAR)

Agregar seccion `// ─── Billing Config Methods ───` con:

| Metodo | Descripcion |
|--------|-------------|
| `findAllBillingConfigs(companyId, filters)` | Listar con filtros (condominium_id, config_type, is_active) + paginacion |
| `findOneBillingConfig(companyId, configId)` | Obtener uno con relaciones |
| `createBillingConfig(companyId, dto, userId)` | Crear + concept_associations en `$transaction` |
| `updateBillingConfig(companyId, configId, dto)` | Actualizar + sync concepts (delete all + recreate en tx) |
| `removeBillingConfig(companyId, configId)` | Eliminar (cascade borra junction) |
| `toggleBillingConfig(companyId, configId)` | Flip `is_active` |

**Includes estandar:**
```typescript
include: {
  condominium: { select: { id: true, name: true } },
  concept_associations: {
    include: { fee_concept: { select: { id: true, name: true, code: true } } },
  },
}
```

---

## Paso 4 — Backend: Controller ✅

**Archivo:** `ph-service/src/modules/billing/billing.controller.ts` (MODIFICAR)

6 endpoints bajo prefix existente `companies/:companyId/ph/billing`:

| HTTP | Ruta | Permiso | Descripcion |
|------|------|---------|-------------|
| GET | `configs` | `ph.billing.view` | Listar configs (query: condominium_id, config_type, is_active, skip, take) |
| GET | `configs/:configId` | `ph.billing.view` | Obtener config por ID |
| POST | `configs` | `ph.billing.create_config` | Crear config |
| PATCH | `configs/:configId` | `ph.billing.edit_config` | Actualizar config |
| DELETE | `configs/:configId` | `ph.billing.delete_config` | Eliminar config |
| PATCH | `configs/:configId/toggle` | `ph.billing.edit_config` | Toggle activo/inactivo |

---

## Paso 5 — Permission Seeds ✅

**Archivo:** `contagracia-shared-modules/prisma/seeds/modules/actions/ph.ts` (MODIFICAR)

Agregar despues de `ph.billing.delete_fee`:

```typescript
// Configuracion de Facturacion
{ action_key: 'ph.billing.create_config', action_name: 'Crear Config Facturacion', description: 'Crear configuracion de interes, descuento o recargo' },
{ action_key: 'ph.billing.edit_config', action_name: 'Editar Config Facturacion', description: 'Editar configuracion de interes, descuento o recargo' },
{ action_key: 'ph.billing.delete_config', action_name: 'Eliminar Config Facturacion', description: 'Eliminar configuracion de interes, descuento o recargo' },
```

> GET reutiliza `ph.billing.view` que ya existe.

---

## Paso 6 — Frontend: Types ✅

**Archivo:** `front_contagracia/src/modules/ph/types/index.ts` (MODIFICAR)

```typescript
export type BillingConfigType = 'interest' | 'discount' | 'surcharge';
export type ValueType = 'percentage' | 'fixed_amount';
export type CalculationPeriod = 'daily' | 'monthly' | 'annual';

export interface PhBillingConfigConcept {
  id: string;
  billing_config_id: string;
  fee_concept_id: string;
  fee_concept?: PhFeeConcept;
}

export interface PhBillingConfig {
  id: string;
  condominium_id: string;
  config_type: BillingConfigType;
  name: string;
  description?: string | null;
  value_type: ValueType;
  value: number;
  calculation_period?: CalculationPeriod | null;
  grace_days: number;
  is_compound: boolean;
  max_percentage?: number | null;
  max_amount?: number | null;
  effective_from: string;
  effective_to?: string | null;
  applies_to_all_concepts: boolean;
  is_active: boolean;
  condominium?: PhCondominium;
  concept_associations?: PhBillingConfigConcept[];
}
```

---

## Paso 7 — Frontend: Service + Hook ✅

### `front_contagracia/src/modules/ph/services/ph.service.ts` (MODIFICAR)

Agregar `billingConfigsService`:
- `getAll(companyId, params?)` → GET `/billing/configs`
- `getOne(companyId, configId)` → GET `/billing/configs/:id`
- `create(companyId, data)` → POST `/billing/configs`
- `update(companyId, configId, data)` → PATCH `/billing/configs/:id`
- `remove(companyId, configId)` → DELETE `/billing/configs/:id`
- `toggle(companyId, configId)` → PATCH `/billing/configs/:id/toggle`

### `front_contagracia/src/modules/ph/hooks/useBillingConfig.ts` (CREAR)

Patron identico a `useFeeConcepts.ts`:
- State: `billingConfigs`, `loading`, `error`
- Methods: `fetchBillingConfigs`, `createBillingConfig`, `updateBillingConfig`, `removeBillingConfig`, `toggleBillingConfig`, `refresh`
- Parametro opcional `condominiumId` para filtrar

### `front_contagracia/src/modules/ph/index.ts` (MODIFICAR)

Agregar: `export { useBillingConfig } from './hooks/useBillingConfig';`

---

## Paso 8 — Frontend: UI Pestana Configuracion ✅

**Archivo:** `front_contagracia/src/app/dashboard/ph/billing/page.tsx` (MODIFICAR)

Reemplazar placeholder (lineas ~690-705) con UI funcional.

### Layout

1. **Filtro** por copropiedad (Select, reusar `condominiumOptions`)
2. **Boton** "Nueva Configuracion"
3. **Tabla** con columnas:

| Columna | Contenido |
|---------|-----------|
| Nombre | `config.name` |
| Tipo | Badge con color segun tipo |
| Valor | `1.5% mensual` o `$ 15.000` |
| Dias Gracia | `config.grace_days` |
| Vigencia | `Desde: dd/mm/yyyy` |
| Conceptos | `Todos` o `3 de 5` |
| Estado | Badge activo/inactivo |
| Acciones | Editar, Eliminar, Toggle |

### Badges por tipo

| Tipo | Color | Label |
|------|-------|-------|
| interest | Rojo | Interes por Mora |
| discount | Verde | Descuento Pronto Pago |
| surcharge | Naranja | Recargo |

### Dialog crear/editar — Campos condicionales

| Campo | Siempre | Solo interest | interest + surcharge | discount |
|-------|---------|---------------|---------------------|----------|
| Copropiedad | X | | | |
| Tipo config | X | | | |
| Nombre | X | | | |
| Descripcion | X | | | |
| Tipo valor | X | | | |
| Valor | X | | | |
| Periodo calculo | | X | | |
| Interes compuesto | | X | | |
| Dias de gracia | | | X | X (dias antes vencimiento) |
| Max porcentaje | X (opc) | | | |
| Max monto | X (opc) | | | |
| Vigencia desde | X | | | |
| Vigencia hasta | X (opc) | | | |
| Aplica a todos | X | | | |
| Conceptos (multi) | Si no aplica a todos | | | |
| Activo | X | | | |

### Delete confirmation

AlertDialog estandar (patron de `settings/page.tsx`)

---

## Resumen de Archivos

| Accion | Archivo |
|--------|---------|
| MODIFICAR | `contagracia-shared-modules/prisma/schema-tenant.prisma` |
| CREAR | `ph-service/src/modules/billing/dto/create-billing-config.dto.ts` |
| CREAR | `ph-service/src/modules/billing/dto/update-billing-config.dto.ts` |
| MODIFICAR | `ph-service/src/modules/billing/billing.service.ts` |
| MODIFICAR | `ph-service/src/modules/billing/billing.controller.ts` |
| MODIFICAR | `contagracia-shared-modules/prisma/seeds/modules/actions/ph.ts` |
| MODIFICAR | `front_contagracia/src/modules/ph/types/index.ts` |
| MODIFICAR | `front_contagracia/src/modules/ph/services/ph.service.ts` |
| CREAR | `front_contagracia/src/modules/ph/hooks/useBillingConfig.ts` |
| MODIFICAR | `front_contagracia/src/modules/ph/index.ts` |
| MODIFICAR | `front_contagracia/src/app/dashboard/ph/billing/page.tsx` |

---

## Verificacion

- [x] `pnpm prisma:generate` + `migrate-all-tenants.ts` → tablas `ph_billing_configs` y `ph_billing_config_concepts` creadas
- [x] `ph-service` arranca sin errores en puerto 3017
- [x] Swagger muestra endpoints `/billing/configs` (6 endpoints)
- [x] CRUD desde Swagger funciona (crear config con conceptos, listar, editar, eliminar)
- [x] Frontend: pestana Configuracion muestra tabla con configs
- [x] Crear config con campos condicionales funciona
- [x] Toggle activo/inactivo funciona
- [x] Asociar conceptos selectivamente funciona (multi-select)
- [x] Eliminar config con AlertDialog de confirmacion funciona
