# Módulo de Impuestos y Retenciones (Frontend)

## Descripción

Página para gestionar impuestos (IVA, INC) y retenciones (ReteIVA, ReteRenta, ReteICA) con pestañas, búsqueda, paginación y modales de CRUD.

## Ubicación

- **Ruta:** `/dashboard/taxes`
- **Módulo:** `src/modules/taxes/`

## Componentes

### TaxesList (`components/TaxesList.tsx`)

Componente principal que muestra la lista de impuestos/retenciones.

**Características:**
- Pestañas para alternar entre Impuestos y Retenciones
- Búsqueda fuzzy por nombre/código
- Filtro por tipo de impuesto (SearchableSelect)
- Paginación (20 por página)
- Columnas de cuentas contables (solo con permiso)
- Botones de acción (crear, editar, eliminar)

**Permisos verificados:**
- `tax.rates.create` - Muestra botón "Crear"
- `tax.rates.edit` - Muestra botón editar en cada fila
- `tax.rates.delete` - Muestra botón eliminar en cada fila
- `accounting.tax.accounts.assign` - Muestra columnas de cuentas contables

### TaxFormModal (`components/TaxFormModal.tsx`)

Modal para crear o editar impuestos/retenciones.

**Props:**
```typescript
interface TaxFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax?: Tax | null;        // null = crear, Tax = editar
  is_tax: boolean;         // true = impuesto, false = retención
  onSuccess: () => void;
}
```

**Campos del formulario:**
- Nombre
- Tasa %
- Tipo (SearchableSelect) - Precargado por defecto
- Descripción
- Toggle "IVA como Mayor Costo" (solo para tipo IVA)

**Nota:** El código se genera automáticamente en el backend.

**Precarga automática:**
- Al abrir el modal en creación:
  - Impuestos: Preselecciona IVA (id=1)
  - Retenciones: Preselecciona ReteRenta (id=6)
- Las cuentas contables se precargan desde `accountingConfigService.getByKey()`
- Al cambiar el tipo, recarga las cuentas correspondientes

**Lógica de visualización de cuentas:**
- **En Creación:** Muestra campos SI la compañía tiene módulo `accounting`
- **En Edición:** Muestra campos SI el usuario tiene permiso `accounting.tax.accounts.assign`

**Mapeo de cuentas por tipo:**
```typescript
const TAX_TYPE_ACCOUNT_KEYS = {
  // Impuestos
  1: { sales: 'sales_iva', purchases: 'purchases_iva' },
  4: { sales: 'finance_inc_sales' },        // INC solo ventas
  10: { sales: 'finance_bag_tax_sales' },   // Bolsas solo ventas
  // Retenciones
  5: { sales: 'sales_reteiva', purchases: 'purchases_reteiva' },
  6: { sales: 'sales_retefuente', purchases: 'purchases_retefuente' },
  7: { sales: 'sales_reteica', purchases: 'purchases_reteica' },
};
```

**Campos de cuentas contables:**

Para impuestos (`is_tax = true`):
- Cuenta Ventas
- Cuenta Compras (oculto si `is_cost_tax = true` o tipo INC/Bolsas)
- Cuenta Mayor Costo (visible solo si `is_cost_tax = true`)

Para retenciones (`is_tax = false`):
- Cuenta Retención Ventas - a favor
- Cuenta Retención Compras - por pagar

**Tipos solo ventas:**
- INC (id=4) - Solo muestra cuenta de ventas
- INC Bolsas (id=10) - Solo muestra cuenta de ventas

**Toggle IVA como Mayor Costo:**
- Solo visible cuando tipo = IVA (id=1)
- Cuando está activo:
  - Oculta campo "Cuenta Compras"
  - Muestra campo "Cuenta Mayor Costo"
- Se envía como `is_cost_tax` al backend

**Exclusión de cuentas:**
Todos los AccountSelect excluyen cuentas de caja y bancos:
```tsx
excludePrefixes="1105,1110"
```

**Posición del dropdown:**
Todos los AccountSelect usan `dropdownPosition="top"` para evitar que se salgan de la pantalla.

### DeleteTaxModal (`components/DeleteTaxModal.tsx`)

Modal de confirmación para eliminar impuestos.

**Props:**
```typescript
interface DeleteTaxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax: Tax | null;
  onSuccess: () => void;
}
```

**Comportamiento:**
1. Al abrir, llama a `GET /taxes/:id/can-delete`
2. Si `canDelete = true`, muestra confirmación
3. Si `canDelete = false`, muestra razón y deshabilita botón eliminar

## Hooks

### useTaxes (`hooks/useTaxes.ts`)

Hook para listar impuestos con paginación y filtros.

```typescript
const {
  taxes,        // Tax[]
  total,        // número total
  page,         // página actual
  totalPages,   // total páginas
  loading,
  error,
  search,       // (term: string) => void
  filterByTaxType, // (id?: number) => void
  setPage,      // (page: number) => void
  refetch,      // () => void
} = useTaxes({ limit: 20, is_tax: true });
```

### useTaxTypes (`hooks/useTaxes.ts`)

Hook para obtener tipos de impuestos.

```typescript
const { taxTypes, loading, error } = useTaxTypes(is_tax);
```

## Servicios

### taxesService (`services/taxes.service.ts`)

```typescript
taxesService.getAll(filters)      // Lista con paginación
taxesService.getTaxTypes(is_tax)  // Tipos para select
taxesService.getOne(id)           // Detalle por ID
taxesService.create(data)         // Crear
taxesService.update(id, data)     // Actualizar
taxesService.canDelete(id)        // Verificar si puede eliminar
taxesService.delete(id)           // Eliminar
```

## Tipos (`types/index.ts`)

```typescript
interface Tax {
  id: string;
  code: string;
  name: string;
  rate: number;
  description: string | null;
  tax_type_id: number;
  is_cost_tax: boolean;          // NUEVO
  tax_type: TaxType | null;
  tax_sales_account: AccountRef | null;
  tax_purchases_account: AccountRef | null;
  tax_cost_account: AccountRef | null;
  withholding_sales_account: AccountRef | null;
  withholding_purchases_account: AccountRef | null;
  created_at: string;
}

interface TaxType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_tax: boolean;
}

interface AccountRef {
  code: string;
  name: string;
}

interface CreateTaxData {
  name: string;
  rate: number;
  tax_type_id: number;
  description?: string;
  is_cost_tax?: boolean;         // NUEVO
  tax_sales_account_code?: string;
  tax_purchases_account_code?: string;
  tax_cost_account_code?: string;
  withholding_sales_account_code?: string;
  withholding_purchases_account_code?: string;
}

interface UpdateTaxData {
  name?: string;
  rate?: number;
  tax_type_id?: number;
  description?: string;
  is_cost_tax?: boolean;         // NUEVO
  tax_sales_account_code?: string | null;
  tax_purchases_account_code?: string | null;
  tax_cost_account_code?: string | null;
  withholding_sales_account_code?: string | null;
  withholding_purchases_account_code?: string | null;
}

interface CanDeleteResponse {
  canDelete: boolean;
  reason?: string;
  itemTaxesCount?: number;
  withholdingsCount?: number;
}
```

## Permisos

| Permiso | Uso |
|---------|-----|
| `tax.rates.view` | Ver página de impuestos |
| `tax.rates.create` | Botón crear y modal de creación |
| `tax.rates.edit` | Botón editar y modal de edición |
| `tax.rates.delete` | Botón eliminar y modal de confirmación |
| `accounting.tax.accounts.assign` | Campos de cuentas contables (en edición) |

**Nota:** En creación, los campos de cuentas se muestran si la compañía tiene el módulo `accounting`.

## Estructura de Archivos

```
src/modules/taxes/
├── components/
│   ├── TaxesList.tsx       # Lista principal con tabs
│   ├── TaxFormModal.tsx    # Modal crear/editar
│   └── DeleteTaxModal.tsx  # Modal confirmación eliminar
├── hooks/
│   └── useTaxes.ts         # useTaxes, useTaxTypes
├── services/
│   └── taxes.service.ts    # API calls
└── types/
    └── index.ts            # Interfaces
```

## Dependencias UI

- `Dialog` - Modal de formulario
- `AlertDialog` - Modal de confirmación
- `SearchableSelect` - Select de tipo impuesto
- `AccountSelect` - Selector de cuentas contables (con `excludePrefixes` y `dropdownPosition`)
- `Switch` - Toggle para IVA como mayor costo
- `Button`, `Input`, `Label`, `Badge`, `Table`

## Changelog (2026-02-06)

- Eliminado campo `code` del formulario (auto-generado por backend)
- Agregado campo `is_cost_tax` con toggle para IVA
- Precarga automática de tipo por defecto (IVA/ReteRenta)
- Precarga automática de cuentas desde `accountingConfigService`
- Lógica diferenciada: creación usa módulo `accounting`, edición usa permiso
- INC y INC Bolsas solo muestran cuenta de ventas
- AccountSelect con `excludePrefixes="1105,1110"` y `dropdownPosition="top"`
- Permisos renombrados de `taxes.*` a `tax.rates.*`
