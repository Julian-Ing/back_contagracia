# Proyectos y Centros de Costos

## Descripcion

Sistema jerarquico para clasificar y distribuir gastos/ingresos por proyecto, departamento, sucursal u otra unidad de negocio. Permite presupuestar (predicciones) y comparar con movimientos reales.

## Estructura Jerarquica

```
Empresa
├── global_predictions (presupuesto general)
└── projects (proyectos)
    ├── project_predictions (presupuesto por proyecto)
    └── cost_centers (centros de costos)
        ├── cost_center_predictions (presupuesto detallado)
        └── cost_center_movements (movimientos reales)

projection_periods → subdivide cualquier prediccion en periodos menores
```

## Tablas

### projects

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| consecutive | varchar | PJT-0001 |
| name | varchar | Nombre del proyecto |
| description | text? | Descripcion |
| is_active | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

### cost_centers

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| project_id | uuid FK | → projects.id |
| consecutive | varchar | CCT-0001 |
| name | varchar | Nombre del centro |
| description | text? | Descripcion |
| types | enum[] | SALE, PURCHASE, EXPENSE, EMPLOYEE_EXPENSE |
| is_active | boolean | |
| created_at | timestamp | |
| updated_at | timestamp | |

### global_predictions

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| consecutive | varchar | GP-0001 |
| name | varchar | Nombre de la prediccion |
| description | text? | |
| init_date | date | Fecha inicio |
| date | date | Fecha fin |
| amounts | jsonb | {sale, purchase, expense, employee_expense} |
| created_at | timestamp | |
| updated_at | timestamp | |

### project_predictions

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| project_id | uuid FK | → projects.id |
| consecutive | varchar | PJP-0001 |
| name | varchar | |
| description | text? | |
| init_date | date | Fecha inicio |
| date | date | Fecha fin |
| amounts | jsonb | {sale, purchase, expense, employee_expense} |
| created_at | timestamp | |
| updated_at | timestamp | |

### cost_center_predictions

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| cost_center_id | uuid FK | → cost_centers.id |
| consecutive | varchar | CCP-0001 |
| name | varchar | |
| description | text? | |
| init_date | date | Fecha inicio |
| date | date | Fecha fin |
| amounts | jsonb | {sale, purchase, expense, employee_expense} |
| created_at | timestamp | |

### projection_periods (Subperiodos)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| prediction_id | uuid | FK polimorfico |
| prediction_type | enum | GLOBAL, PROJECT, COST_CENTER |
| period_start | date | Inicio del periodo |
| period_end | date | Fin del periodo |
| period_label | varchar? | "Enero 2025", "Q1 2025" |
| sale_amount | decimal(18,2) | |
| purchase_amount | decimal(18,2) | |
| expense_amount | decimal(18,2) | |
| employee_expense_amount | decimal(18,2) | |
| notes | text? | |
| created_at | timestamp | |
| updated_at | timestamp | |

### cost_center_movements

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| cost_center_id | uuid FK | → cost_centers.id |
| consecutive | varchar | CCM-0001 |
| movement_date | date | Fecha del movimiento |
| type | enum | SALE, PURCHASE, EXPENSE, EMPLOYEE_EXPENSE |
| amount | decimal(19,4) | |
| description | text? | |
| reference_id | uuid? | Documento origen |
| reference_type | varchar? | invoice, purchase, expense... |
| created_at | timestamp | |

## Consecutive Types

```typescript
{ type: 'project', default_prefix: 'PJT', description: 'Proyecto' },
{ type: 'cost_center', default_prefix: 'CCT', description: 'Centro de Costos' },
{ type: 'global_prediction', default_prefix: 'GP', description: 'Prediccion Global' },
{ type: 'project_prediction', default_prefix: 'PJP', description: 'Prediccion de Proyecto' },
{ type: 'cost_center_prediction', default_prefix: 'CCP', description: 'Prediccion de Centro' },
{ type: 'cost_center_movement', default_prefix: 'CCM', description: 'Movimiento de Centro' },
```

## Campo types en CostCenter

Array que indica que tipos de movimiento aplican:
- **SALE** - Ingresos por ventas
- **PURCHASE** - Costos de compras
- **EXPENSE** - Gastos operativos
- **EMPLOYEE_EXPENSE** - Gastos de empleados/viaticos

## Campo amounts en Predictions (JSONB)

```json
{
  "sale": 1000000,
  "purchase": 500000,
  "expense": 200000,
  "employee_expense": 100000
}
```

## Tablas con cost_center_id

- third_parties.cost_center_id → asignar terceros a un centro
- employees.cost_center_id → asignar empleados a un centro
- cash_registers.cost_center_id → asignar cajas POS a un centro
- documents.cost_center_id → asignar facturas/compras/gastos a un centro

## Flujo de Uso

1. Crear **prediccion global** con presupuesto anual de la empresa
2. Subdividir en **projection_periods** mensuales (automatico o manual)
3. Crear **proyectos** y sus **predicciones por proyecto**
4. Crear **centros de costo** dentro de cada proyecto
5. Crear **predicciones por centro** con detalle
6. Registrar **movimientos** reales al facturar/comprar/gastar
7. Comparar predicho vs real en cada nivel y periodo

## Archivos

- `prisma/schema-tenant.prisma` - Modelos Prisma
- `prisma/seeds/consecutiveTypes.ts` - Tipos de consecutivo
- `docs/centro-de-costos.md` - Esta documentacion

## Estado

IMPLEMENTADO - Modelos creados en Prisma, migraciones aplicadas a tenants.
