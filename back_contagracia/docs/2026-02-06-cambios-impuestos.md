# Cambios 2026-02-06: Módulo de Impuestos y Retenciones

## Resumen

Mejoras al formulario de impuestos/retenciones con precarga de cuentas contables, toggle IVA como mayor costo, eliminación del campo `requires_admin`, y generación automática del código.

---

## Backend

### 1. Eliminación de `requires_admin`

Se eliminó el campo `requires_admin` de `SystemAction` ya que era subjetivo y no debería existir.

**Archivos modificados:**
- `prisma/schema-master.prisma` - Quitado campo
- `prisma/schema-tenant.prisma` - Quitado campo
- `prisma/seeds/modules/types.ts` - Quitado de interface `ActionDef`
- `prisma/seeds/modules/actions/*.ts` - Quitado de todos los permisos
- `prisma/seeds/modules/index.ts` - Quitada lógica de rename
- `prisma/scripts/seed-all-tenants.ts` - Quitada lógica de rename
- `company-service/src/modules/tenant/tenant.service.ts` - Quitado del upsert
- `admin-service/src/modules/companies/companies.service.ts` - Quitado del upsert
- `admin-service/src/modules/plans/plans.service.ts` - Quitado del upsert
- `admin-service/src/modules/system-actions/dto/create-system-action.dto.ts` - Quitado campo

### 2. Nuevo campo `is_cost_tax` en Tax

Agregado campo para indicar si el IVA se maneja como mayor costo.

**Schema:**
```prisma
model Tax {
  // ...
  is_cost_tax Boolean @default(false) // Solo IVA: usa cuenta costo en vez de compras
}
```

**Migración aplicada a tenants.**

### 3. Generación automática del código

El campo `code` del Tax se genera automáticamente en el backend usando el `tax_type_id`:

```typescript
code: String(dto.tax_type_id)
```

- Eliminado `code` del `CreateTaxDto`
- El código es igual al ID del tipo de impuesto seleccionado

### 3. Permisos de Impuestos

Los permisos se mantienen como `tax.rates.*`:
- `tax.rates.view`
- `tax.rates.create`
- `tax.rates.edit`
- `tax.rates.delete`

---

## Frontend

### 1. TaxFormModal - Precarga de Cuentas

**Lógica de visualización de cuentas:**
- **Creación**: Muestra campos SI tiene módulo `accounting`
- **Edición**: Muestra campos SI tiene permiso `accounting.tax.accounts.assign`

**Precarga automática:**
- Al abrir el modal, precarga tipo por defecto:
  - Impuestos: IVA (id=1)
  - Retenciones: ReteRenta (id=6)
- Carga cuentas desde `accountingConfigService.getByKey()`
- Al cambiar el tipo, recarga las cuentas correspondientes

### 2. Mapeo de Cuentas por Tipo

```typescript
const TAX_TYPE_ACCOUNT_KEYS = {
  // Impuestos
  1: { sales: 'sales_iva', purchases: 'purchases_iva' },
  4: { sales: 'finance_inc_sales' }, // INC solo ventas
  10: { sales: 'finance_bag_tax_sales' }, // Bolsas solo ventas
  // Retenciones
  5: { sales: 'sales_reteiva', purchases: 'purchases_reteiva' },
  6: { sales: 'sales_retefuente', purchases: 'purchases_retefuente' },
  7: { sales: 'sales_reteica', purchases: 'purchases_reteica' },
};
```

### 3. Toggle IVA como Mayor Costo

- Solo visible cuando tipo = IVA (id=1)
- Cuando está activo:
  - Oculta campo "Cuenta Compras"
  - Muestra campo "Cuenta Mayor Costo"
- Se envía como `is_cost_tax` al backend

### 4. Tipos Solo Ventas

INC (4) y INC Bolsas (10) solo muestran cuenta de ventas, no de compras ni costo.

### 5. Exclusión de Cuentas

Todos los AccountSelect excluyen cuentas de caja y bancos:
```tsx
excludePrefixes="1105,1110"
```

### 6. Dropdown Position

Todos los AccountSelect usan `dropdownPosition="top"` para evitar que se salgan de la pantalla.

### 7. Tipos Actualizados

```typescript
interface Tax {
  // ...
  is_cost_tax: boolean;
}

interface CreateTaxData {
  // ...
  is_cost_tax?: boolean;
}

interface UpdateTaxData {
  // ...
  is_cost_tax?: boolean;
}
```

---

## Archivos Modificados

### Backend
```
contagracia-shared-modules/
├── prisma/
│   ├── schema-master.prisma
│   ├── schema-tenant.prisma
│   ├── seeds/
│   │   ├── modules/
│   │   │   ├── types.ts
│   │   │   ├── index.ts
│   │   │   └── actions/*.ts
│   │   └── seed-accounting-config.ts
│   └── scripts/
│       └── seed-all-tenants.ts
├── docs/
│   ├── seed-modules-structure.md
│   └── permisos-roles-auditoria.md

company-service/
└── src/modules/tenant/tenant.service.ts

admin-service/
└── src/modules/
    ├── companies/companies.service.ts
    ├── plans/plans.service.ts
    └── system-actions/dto/create-system-action.dto.ts
```

### Frontend
```
front_contagracia/
└── src/modules/
    ├── admin/types/index.ts
    └── taxes/
        ├── types/index.ts
        └── components/
            ├── TaxesList.tsx
            └── TaxFormModal.tsx
```

---

## Testing

1. Crear impuesto tipo IVA → debe precargar cuentas de IVA
2. Crear retención tipo ReteRenta → debe precargar cuentas de Retefuente
3. Cambiar tipo a INC → solo debe mostrar cuenta ventas
4. Activar toggle "IVA como Mayor Costo" → debe ocultar compras y mostrar costo
5. Editar impuesto sin cuentas con permiso → debe precargar desde config
6. Verificar que AccountSelect no muestre cuentas 1105* ni 1110*
