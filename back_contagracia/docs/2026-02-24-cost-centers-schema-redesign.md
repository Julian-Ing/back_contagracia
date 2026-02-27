# Rediseño del schema de Centro de Costos

**Fecha:** 2026-02-24

## Resumen

Se rediseñó completamente el módulo de centros de costos: jerarquía recursiva en una sola tabla (sin tabla Project separada), proyecciones unificadas, movimientos por línea con catálogos de tipos de línea y tipos de documento origen, sign por movimiento, y cost_center_id + cost_center_movement_id en JournalEntryItem.

## Modelos eliminados

- `Project` — reemplazado por CostCenter recursivo (parent_id)
- `GlobalPrediction` — unificado en Projection (scope=GLOBAL)
- `ProjectPrediction` — unificado en Projection (scope=COST_CENTER)
- `CostCenterPrediction` — unificado en Projection (scope=COST_CENTER)
- `CostCenterType` enum — reemplazado por tabla catálogo CostCenterMovementType
- `PredictionType` enum — reemplazado por ProjectionScope enum

## Modelos nuevos/rediseñados

### CostCenter (recursivo)

```prisma
model CostCenter {
  id, parent_id?, consecutive, name, description, is_active
  parent → self, children → self[]
  projections, movements, journal_entry_items
  + relaciones externas (CRM, HR, POS)
}
```

- `parent_id` nullable: null=raíz, set=hijo
- Profundidad infinita (en práctica 2-3 niveles)
- Ejemplo: CCT-0001 "Construcción Edificio" → CCT-0002 "Materiales", CCT-0003 "Mano de Obra"

### CostCenterMovementType (catálogo — tipo de línea)

Representa qué **concepto** es cada línea del movimiento. Necesario porque la empresa puede tener CC sin contabilidad (no se puede derivar del PUC). La empresa puede crear tipos adicionales.

**21 tipos default:**

| Grupo | Key | Nombre |
|-------|-----|--------|
| Ingresos/Costos/Gastos | `income`, `cost`, `expense`, `discount` | Ingreso, Costo, Gasto, Descuento |
| Impuestos | `tax_iva`, `tax_inc` | IVA, INC |
| Retenciones | `withholding_income`, `withholding_iva`, `withholding_ica` | ReteFuente, ReteIVA, ReteICA |
| Cartera | `cxc`, `cxp` | Cuentas por Cobrar, Cuentas por Pagar |
| Tesorería | `bank_movement`, `cash_movement` | Movimiento Bancario, Movimiento de Caja |
| Anticipos | `prepayment_customer`, `prepayment_supplier`, `prepayment_employee` | Anticipo de Cliente/Proveedor/Empleado |
| Contabilidad | `period_close`, `opening_balance`, `tax_settlement`, `reconciliation_adjustment`, `other` | Cierre, Saldos Iniciales, Liquidación Impuesto, Ajuste Conciliación, Otro |

### CostCenterMovementReferenceType (catálogo — tipo de documento origen)

Indica de qué documento/proceso se originó el movimiento. Permite resolver el `reference_id` sin buscar tabla por tabla.

**15 tipos:**

| Grupo | Key | Nombre |
|-------|-----|--------|
| Venta | `invoice`, `invoice_credit_note`, `invoice_debit_note` | Factura, NC Venta, ND Venta |
| Compra | `purchase`, `purchase_credit_note` | Compra, NC Compra |
| Gasto | `expense`, `expense_credit_note` | Gasto, NC Gasto |
| Contabilidad | `journal_entry`, `payment_receipt`, `disbursement`, `accounting_period` | Asiento, Recibo de Caja, CE, Periodo |
| Cartera | `prepayment` | Anticipo |
| Bancos/Impuestos | `bank_reconciliation`, `tax_report` | Conciliación, Reporte Impuestos |
| Nómina | `payroll` | Nómina |

### CostCenterMovement

```prisma
model CostCenterMovement {
  id, cost_center_id, movement_date, type_key, reference_type_key?,
  sign (POSITIVE|NEGATIVE), amount, description, reference_id?
  → CostCenter, CostCenterMovementType, CostCenterMovementReferenceType?
}
```

- **1 movimiento por línea** de asiento (no por documento) — un documento puede generar varias líneas con tipos distintos y cada una puede ir a un CC diferente
- `sign`: enum POSITIVE/NEGATIVE en cada movimiento (no en el tipo)
- Independiente de contabilidad (empresa puede tener CC sin módulo accounting)
- `journal_entry_items` relación inversa

### JournalEntryItem (campos agregados)

- `cost_center_id String?` — FK nullable a CostCenter (consultas directas sin JOIN)
- `cost_center_movement_id String?` — FK nullable a CostCenterMovement (trazabilidad)
- Índices en ambos campos
- Si se selecciona un CC, siempre se crea el movimiento (ambos campos se llenan)

### Projection (recursiva — 2 tablas)

```prisma
model Projection {
  id, parent_id?, cost_center_id?, scope (GLOBAL|COST_CENTER)
  consecutive, name, description, start_date, end_date
  parent → self, children → self[]
  → CostCenter?, ProjectionItem[]
}

model ProjectionItem {
  id, projection_id, type_key, amount
  → Projection, CostCenterMovementType
  @@unique([projection_id, type_key])
}
```

- Recursiva: proyección anual → hijos mensuales → hijos semanales, etc.
- Items dinámicos por tipo de línea (agregar tipo no requiere migración)
- scope=GLOBAL + cost_center_id=null → proyección empresa
- scope=COST_CENTER + cost_center_id=X → proyección de un CC específico

## Seeders

### Catálogos de CC (tenant-only, no vienen de master)

- `costCenterMovementTypes.ts` — 21 tipos de **línea** (concepto del movimiento)
- `costCenterMovementReferenceTypes.ts` — 15 tipos de **documento** origen
- Integrados en `seed-all-tenants.ts` con upsert por `key`
- La empresa puede crear tipos adicionales desde la UI

## Consecutive types

### Eliminados
- `project` (PJT) — ya no existe Project
- `global_prediction` (GP) — unificado
- `project_prediction` (PJP) — unificado
- `cost_center_prediction` (CCP) — unificado
- `cost_center_movement` (CCM) — movimientos sin consecutivo propio

### Agregado
- `projection` (PRJ) — para tabla Projection unificada

### Se mantiene
- `cost_center` (CCT)

## Permisos

### Eliminado
- `cost_centers.view_detail` — redundante con `cost_centers.view`

### Renombrados
- `cost_centers.predictions.*` → `cost_centers.projections.*` (create, edit, delete)

### Lista final (10 permisos)
- `cost_centers.view`, `.create`, `.edit`, `.delete`
- `cost_centers.projections.create`, `.edit`, `.delete`
- `cost_centers.comparison.view`
- `cost_centers.reports.view`
- `cost_centers.export`

## CRUD Backend (accounting-service)

### Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `cost-centers/dto/create-cost-center.dto.ts` | name (requerido), description?, parent_id? |
| `cost-centers/dto/update-cost-center.dto.ts` | name?, description?, parent_id? (null = mover a raíz) |
| `cost-centers/dto/index.ts` | Barrel export de DTOs |
| `cost-centers/cost-centers.service.ts` | Lógica de negocio completa |
| `cost-centers/cost-centers.controller.ts` | Endpoints REST |
| `cost-centers/cost-centers.module.ts` | Módulo NestJS |

### Archivos modificados

- `app.module.ts` — registrado `CostCentersModule`
- `contagracia-shared-modules/prisma/scripts/migrate-all-tenants.ts` — índices GIN para cost_centers (name, consecutive, description)

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cost-centers` | Lista paginada o árbol (`?tree=true`), fuzzy search con `word_similarity` |
| GET | `/cost-centers/:id` | Detalle con parent, children activos, counts de relaciones |
| POST | `/cost-centers` | Crear CC (sub-centro con parent_id). Consecutivo automático CCT-XXXX |
| PUT | `/cost-centers/:id` | Actualizar (prevención de ciclos, validación de nombre único por nivel) |
| DELETE | `/cost-centers/:id` | Hard delete si no tiene relaciones; soft delete (is_active=false) si tiene hijos, movimientos, proyecciones o líneas de asiento |
| PUT | `/cost-centers/:id/reactivate` | Reactivar CC desactivado (valida que el padre esté activo) |

### Query params de GET /cost-centers

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `search` | string | — | Búsqueda fuzzy por name, consecutive, description (ILIKE + word_similarity > 0.3) |
| `page` | number | 1 | Página (modo plano) |
| `limit` | number | 50 | Registros por página |
| `includeInactive` | boolean | false | Incluir CCs desactivados |
| `tree` | boolean | false | Retornar árbol jerárquico en vez de lista plana |

### Lógica de eliminación

1. Cuenta relaciones: children activos, movements, projections, journal_entry_items
2. Si tiene alguna → soft delete (is_active=false) + retorna mensaje con detalle
3. Si no tiene ninguna → hard delete

### Validaciones

- **Crear**: parent existe y está activo, nombre único en el mismo nivel
- **Actualizar**: no puede ser su propio padre, no puede mover a un descendiente (prevención de ciclos con `isDescendantOf`), nombre único en nuevo nivel
- **Reactivar**: el padre debe estar activo
- **Permisos**: no se validan en backend (en desarrollo), solo en frontend

### Índices GIN (fuzzy search)

```sql
CREATE INDEX IF NOT EXISTS idx_cc_name_trgm ON "cost_centers" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cc_consecutive_trgm ON "cost_centers" USING gin ("consecutive" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cc_description_trgm ON "cost_centers" USING gin ("description" gin_trgm_ops);
```

## Función shared: createCostCenterMovement

**Archivo:** `contagracia-shared-modules/src/functions/create-cost-center-movement.ts`
**Export:** `@contagracia/shared-modules`

Inserta un movimiento de centro de costos dentro de una transacción existente. Si el proceso padre falla, el movimiento se revierte automáticamente.

### Firma

```typescript
createCostCenterMovement(tx: any, data: CreateCostCenterMovementData): Promise<CostCenterMovement>
```

### Campos (CreateCostCenterMovementData)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `cost_center_id` | string | si | ID del centro de costos |
| `movement_date` | Date | si | Fecha del movimiento |
| `type_key` | string | si | Tipo de línea (income, cost, tax_iva, etc.) |
| `reference_type_key` | string | si | Tipo de documento origen (invoice, purchase, etc.) |
| `sign` | 'POSITIVE' \| 'NEGATIVE' | si | Signo del movimiento |
| `amount` | number \| string | si | Monto del movimiento |
| `reference_id` | string | no | ID del documento origen |
| `description` | string | no | Descripción libre |

### Cambio de schema

- `CostCenterMovement.reference_type_key`: cambió de `String?` a `String` (requerido) — todo movimiento debe tener un tipo de documento origen
