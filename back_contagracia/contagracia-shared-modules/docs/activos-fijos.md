# Activos Fijos

## Descripcion
Sistema de activos fijos con depreciacion, movimientos y categorias configurables.

## Enums

```prisma
enum FixedAssetStatus {
  ACTIVE    // Activo
  INACTIVE  // Inactivo
  DISPOSED  // Dado de baja
}

enum FixedAssetMovementType {
  CREATION        // Alta/Creacion del activo
  DEPRECIATION    // Depreciacion periodica
  ADJUSTMENT      // Ajuste de valor
  ANNULMENT       // Anulacion del activo
  PURCHASE_RETURN // Devolucion de compra
  DISPOSAL        // Baja del activo
  SALE            // Venta del activo
}

enum DepreciationCalculationBasis {
  USEFUL_LIFE // Por vida util en meses
  PERCENTAGE  // Por porcentaje anual
}
```

## Modelos

### FixedAssetCategory

Categorias configurables para activos fijos.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| key | varchar | LAND, MACHINERY, etc. |
| name | varchar | Terrenos, Maquinaria |
| is_tangible | boolean | TRUE = tangible, FALSE = intangible |
| is_active | boolean | Activo/Inactivo |

### FixedAsset

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| consecutive | varchar | AF-0001 |
| name | varchar | Nombre del activo |
| description | text | Descripcion |
| reference | varchar | Placa, serie, numero |
| category_id | FK | Categoria |
| quantity | int | Cantidad de unidades |
| image_path | varchar | Ruta de imagen |
| **Costos** | | |
| acquisition_date | date | Fecha de adquisicion |
| unit_cost | decimal(19,4) | Costo unitario |
| total_cost | decimal(19,4) | Costo total |
| **Depreciacion** | | |
| residual_value | decimal(19,4) | Valor residual |
| calculation_basis | enum | USEFUL_LIFE o PERCENTAGE |
| useful_life_months | int | Vida util en meses |
| depreciation_rate | decimal(5,2) | % anual |
| depreciation_start_date | date | Inicio depreciacion |
| last_depreciation_date | date | Ultima depreciacion |
| accumulated_depreciation | decimal(19,4) | Depreciacion acumulada |
| net_book_value | decimal(19,4) | Valor neto en libros |
| **Cuentas Contables** | | |
| asset_account_code | FK | Cuenta del activo (15xxxx) |
| depreciation_account_code | FK | Cuenta deprec. acumulada (159xxx) |
| expense_account_code | FK | Cuenta gasto deprec. (5260xx) |
| **Estado** | | |
| status | enum | ACTIVE, INACTIVE, DISPOSED |

### FixedAssetMovement

Movimientos con tracking completo de cambios.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| consecutive | varchar | AFM-0001 |
| fixed_asset_id | FK | Activo fijo |
| movement_type | enum | Tipo de movimiento |
| description | text | Descripcion |
| movement_date | date | Fecha |
| movement_time | time | Hora |
| **Cambios** | | |
| quantity_change | decimal(19,4) | +/- unidades |
| cost_change | decimal(19,4) | +/- costo |
| depreciation_change | decimal(19,4) | +/- depreciacion |
| book_value_change | decimal(19,4) | +/- valor en libros |
| **Snapshot ANTES** | | |
| quantity_before | decimal(19,4) | Cantidad antes |
| cost_before | decimal(19,4) | Costo antes |
| depreciation_before | decimal(19,4) | Deprec. antes |
| book_value_before | decimal(19,4) | Valor libros antes |
| **Snapshot DESPUES** | | |
| quantity_after | decimal(19,4) | Cantidad despues |
| cost_after | decimal(19,4) | Costo despues |
| depreciation_after | decimal(19,4) | Deprec. despues |
| book_value_after | decimal(19,4) | Valor libros despues |
| **Auditoria** | | |
| journal_entry_id | FK | Asiento contable |
| created_by | FK | Usuario que creo |

## Categorias por Defecto (Seed)

### Tangibles (8)
| Key | Nombre |
|-----|--------|
| LAND | Terrenos |
| BUILDINGS | Edificios y construcciones |
| MACHINERY | Maquinaria |
| COMPUTER_EQUIPMENT | Equipos de computo |
| OFFICE_EQUIPMENT | Equipos de oficina |
| FURNITURE | Muebles y enseres |
| TRANSPORTATION | Equipos de transporte |
| OTHER_TANGIBLE | Otros tangibles |

### Intangibles (6)
| Key | Nombre |
|-----|--------|
| TRADEMARK | Marcas |
| PATENT | Patentes |
| COPYRIGHT | Derechos de autor |
| FRANCHISE | Franquicias |
| LICENSES | Licencias y permisos |
| OTHER_INTANGIBLE | Otros intangibles |

## Relaciones

```
FixedAssetCategory
└── fixed_assets (activos de esta categoria)

FixedAsset
├── category → FixedAssetCategory
├── asset_account → ChartOfAccount (cuenta activo)
├── depreciation_account → ChartOfAccount (cuenta deprec. acumulada)
├── expense_account → ChartOfAccount (cuenta gasto deprec.)
└── movements → FixedAssetMovement[]

FixedAssetMovement
├── fixed_asset → FixedAsset
├── journal_entry → JournalEntry
└── created_by_user → TenantUser
```

## Comportamiento de Movimientos

### CREATION (Alta)
- quantity_change: +N
- cost_change: +total_cost
- depreciation_change: 0
- Genera asiento: Debito activo, Credito banco/proveedor

### DEPRECIATION (Depreciacion)
- quantity_change: 0
- cost_change: 0
- depreciation_change: +monto_deprec
- Genera asiento: Debito gasto, Credito deprec. acumulada

### DISPOSAL (Baja)
- quantity_change: -N
- cost_change: -costo_proporcional
- depreciation_change: -deprec_proporcional
- Genera asiento de baja

### SALE (Venta)
- Similar a DISPOSAL pero con ingreso por venta
- Puede generar ganancia o perdida

## Archivo Modificado

- `prisma/schema-tenant.prisma`

## Migracion

```bash
pnpm prisma:generate
npx ts-node prisma/scripts/migrate-all-tenants.ts
```
