# Expense Categories (Categorías de Gasto)

## Descripcion

Categorías predefinidas para clasificar gastos/legalizaciones de viáticos. Cada categoría tiene una cuenta contable del PUC asociada.

## Modelo

### ExpenseCategory

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| name | varchar UNIQUE | Nombre de la categoría |
| description | text | Descripcion |
| expense_account_code | varchar FK | → chart_of_accounts.code |
| is_service | boolean | Si es servicio (para retenciones) |
| created_at | timestamptz | Fecha creacion |

## Categorías por Defecto (16)

| Nombre | Cuenta PUC | is_service |
|--------|------------|------------|
| Alimentos y bebidas | 519901 | false |
| Arriendo o vivienda | 519902 | false |
| Servicios públicos | 519903 | false |
| Transporte | 519904 | false |
| Salud | 519905 | false |
| Educación | 519906 | false |
| Recreación y cultura | 519907 | false |
| Comunicaciones | 519908 | false |
| Vestido y calzado | 519909 | false |
| Restaurantes y comidas fuera | 519910 | false |
| Muebles y mantenimiento del hogar | 519911 | false |
| Cuidado personal | 519912 | false |
| Seguros | 519913 | false |
| Impuestos | 519914 | false |
| Honorarios profesionales | 519915 | **true** |
| Contribuciones y afiliaciones | 519916 | false |

## Relaciones

```
ExpenseCategory
├── expense_account → ChartOfAccount (cuenta de gasto)
└── documents → Document[] (gastos/legalizaciones)

Document (type=expense)
└── category → ExpenseCategory
```

## Uso

- Se usa en documentos tipo `expense` (gastos) y legalizaciones de viáticos
- El campo `is_service` indica si aplica retención por servicios (ej: Honorarios)
- Las cuentas 5199xx son subcuentas de "Otros gastos" (5199)

## Archivos

- `prisma/schema-tenant.prisma` - Modelo ExpenseCategory
- `prisma/seeds/expenseCategories.ts` - Datos seed
- `prisma/scripts/seed-all-tenants.ts` - Seeding a tenants
