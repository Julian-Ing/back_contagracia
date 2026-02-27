# Módulo de Impuestos y Retenciones (tax-service)

## Descripción

El módulo de impuestos permite gestionar impuestos (IVA, INC, INC Bolsas) y retenciones (ReteIVA, ReteRenta, ReteICA) con soporte para cuentas contables configurables.

## Endpoints

### GET /taxes
Lista impuestos y retenciones con paginación y búsqueda.

**Query params:**
- `search`: Búsqueda fuzzy por nombre o código
- `is_tax`: `true` para impuestos, `false` para retenciones
- `tax_type_id`: Filtrar por tipo específico
- `page`: Página (default: 1)
- `limit`: Límite por página (default: 20)

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "code": "01",
    "name": "IVA 19%",
    "rate": 19.00,
    "description": "Impuesto al valor agregado",
    "tax_type_id": 1,
    "is_cost_tax": false,
    "tax_type": { "id": 1, "code": "01", "name": "IVA", "is_tax": true },
    "tax_sales_account": { "code": "24080501", "name": "IVA Generado" },
    "tax_purchases_account": { "code": "24081001", "name": "IVA Descontable" },
    "tax_cost_account": null,
    "withholding_sales_account": null,
    "withholding_purchases_account": null,
    "created_at": "2026-02-06T..."
  }],
  "total": 6,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "hasMore": false
}
```

### GET /taxes/types
Lista tipos de impuestos para selects.

**Query params:**
- `is_tax`: `true` para tipos de impuestos, `false` para tipos de retenciones

### GET /taxes/:id
Obtiene detalle de un impuesto por ID.

### GET /taxes/:id/can-delete
Verifica si un impuesto puede ser eliminado.

**Response:**
```json
{
  "canDelete": true,
  "itemTaxesCount": 0,
  "withholdingsCount": 0
}
```

O si no se puede eliminar:
```json
{
  "canDelete": false,
  "reason": "Tiene 5 documento(s) con este impuesto aplicado",
  "itemTaxesCount": 5,
  "withholdingsCount": 0
}
```

### POST /taxes
Crea un nuevo impuesto o retención.

**Body:**
```json
{
  "name": "IVA 8%",
  "rate": 8.00,
  "tax_type_id": 1,
  "description": "IVA reducido",
  "is_cost_tax": false,
  "tax_sales_account_code": "24080501",
  "tax_purchases_account_code": "24081001",
  "tax_cost_account_code": null
}
```

### PUT /taxes/:id
Actualiza un impuesto existente.

**Body:** (todos los campos opcionales)
```json
{
  "name": "IVA 8% Modificado",
  "rate": 8.00,
  "tax_type_id": 1,
  "description": "Nueva descripción",
  "is_cost_tax": true,
  "tax_sales_account_code": "24080501",
  "tax_cost_account_code": "51050501"
}
```

### DELETE /taxes/:id
Elimina un impuesto. Falla si tiene:
- Productos asociados (`products.tax_id`)
- Impuestos de documento (`document_item_taxes.tax_id`)
- Retenciones de documento (`document_withholdings.withholding_id`)

## Modelo de Datos

### Tax
```prisma
model Tax {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  rate        Decimal  @db.Decimal(8, 4)
  tax_type_id Int      @default(1)
  description String?
  is_cost_tax Boolean  @default(false) // Solo IVA: usa cuenta costo en vez de compras
  is_active   Boolean  @default(true)

  // Cuentas para impuestos
  tax_sales_account_code     String?
  tax_purchases_account_code String?
  tax_cost_account_code      String?

  // Cuentas para retenciones
  withholding_sales_account_code     String?
  withholding_purchases_account_code String?

  // Relaciones
  tax_type              TaxType
  products              Product[]
  document_item_taxes   DocumentItemTax[]
  document_withholdings DocumentWithholding[]

  // Relaciones a cuentas contables
  tax_sales_account             ChartOfAccount?
  tax_purchases_account         ChartOfAccount?
  tax_cost_account              ChartOfAccount?
  withholding_sales_account     ChartOfAccount?
  withholding_purchases_account ChartOfAccount?
}
```

### TaxType
```prisma
model TaxType {
  id          Int      @id
  code        String   @unique
  name        String
  description String?
  is_tax      Boolean  @default(true)  // true=impuesto, false=retención
  is_active   Boolean  @default(true)
  taxes       Tax[]
}
```

## Permisos

| Permiso | Descripción |
|---------|-------------|
| `tax.rates.view` | Ver impuestos y retenciones |
| `tax.rates.create` | Crear impuesto o retención |
| `tax.rates.edit` | Editar impuesto o retención |
| `tax.rates.delete` | Eliminar impuesto o retención |
| `accounting.tax.accounts.assign` | Asignar cuentas contables a impuestos |

## Tipos de Impuestos (TaxType)

### Impuestos (is_tax = true)
| ID | Código | Nombre | Cuentas |
|----|--------|--------|---------|
| 1 | 01 | IVA | Ventas + Compras (o Costo si is_cost_tax) |
| 4 | 04 | INC | Solo Ventas |
| 10 | 22 | INC Bolsas | Solo Ventas |

### Retenciones (is_tax = false)
| ID | Código | Nombre | Cuentas |
|----|--------|--------|---------|
| 5 | 05 | ReteIVA | Ventas (a favor) + Compras (por pagar) |
| 6 | 06 | ReteRenta | Ventas (a favor) + Compras (por pagar) |
| 7 | 07 | ReteICA | Ventas (a favor) + Compras (por pagar) |

## Mapeo de Cuentas Contables por Defecto

Las cuentas se precargan desde `accounting_config`:

| Tipo | Key Ventas | Key Compras |
|------|------------|-------------|
| IVA | `sales_iva` | `purchases_iva` |
| INC | `finance_inc_sales` | - |
| INC Bolsas | `finance_bag_tax_sales` | - |
| ReteIVA | `sales_reteiva` | `purchases_reteiva` |
| ReteRenta | `sales_retefuente` | `purchases_retefuente` |
| ReteICA | `sales_reteica` | `purchases_reteica` |

## IVA como Mayor Costo

Para impuestos tipo IVA, existe la opción `is_cost_tax`:
- `false` (default): Usa cuenta de compras (IVA descontable)
- `true`: Usa cuenta de costo (IVA no descontable, va al gasto)

Cuando `is_cost_tax = true`:
- Se oculta el campo de cuenta de compras
- Se muestra el campo de cuenta de costo

## Frontend

### Componentes
- `TaxesList.tsx` - Lista con tabs Impuestos/Retenciones
- `TaxFormModal.tsx` - Modal de creación/edición
- `DeleteTaxModal.tsx` - Modal de confirmación de eliminación

### Lógica de Cuentas

**En Creación:**
- Muestra campos de cuentas SI la compañía tiene módulo `accounting`
- Precarga tipo por defecto (IVA para impuestos, ReteRenta para retenciones)
- Precarga cuentas desde `accounting_config`

**En Edición:**
- Muestra campos de cuentas SI el usuario tiene permiso `accounting.tax.accounts.assign`
- Si las cuentas están vacías y tiene permiso, precarga desde config

### Exclusión de Cuentas
Todos los selectores de cuentas excluyen las cuentas de caja y bancos:
- `excludePrefixes="1105,1110"`

### Dropdown Position
Los selectores de cuentas usan `dropdownPosition="top"` para evitar que se salgan de la pantalla.

## Archivos

### Backend
- `src/modules/taxes/taxes.controller.ts` - Endpoints
- `src/modules/taxes/taxes.service.ts` - Lógica de negocio
- `src/modules/taxes/dto/create-tax.dto.ts` - DTO creación
- `src/modules/taxes/dto/update-tax.dto.ts` - DTO actualización
- `prisma/schema-tenant.prisma` - Modelo Tax
- `prisma/seeds/modules/actions/tax.ts` - Permisos

### Frontend
- `src/modules/taxes/components/TaxesList.tsx`
- `src/modules/taxes/components/TaxFormModal.tsx`
- `src/modules/taxes/components/DeleteTaxModal.tsx`
- `src/modules/taxes/types/index.ts`
- `src/modules/taxes/services/taxes.service.ts`
- `src/modules/taxes/hooks/useTaxes.ts`
