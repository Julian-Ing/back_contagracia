# Configuración Contable (AccountingConfig)

## Resumen

Tabla de configuración que mapea conceptos contables (keys) a cuentas del plan de cuentas (ChartOfAccount).

## Modelo

```prisma
model AccountingConfig {
  key         String   @id
  description String
  account_id  String
  default     String   // código PUC por defecto
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  account ChartOfAccount @relation(fields: [account_id], references: [id])

  @@map("accounting_configs")
}
```

## Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `key` | String (PK) | Identificador único del concepto (ej: "SALES_INCOME") |
| `description` | String | Descripción legible del concepto |
| `account_id` | String (FK) | ID de la cuenta contable asignada |
| `default` | String | Código PUC por defecto (ej: "4135") |

## Keys Típicos

**Convención:** keys en minúsculas con guión bajo (snake_case)

| Key | Descripción | Default |
|-----|-------------|---------|
| `sales_income` | Ingresos por ventas | 4135 |
| `purchases_cost` | Costo de mercancía vendida | 6135 |
| `vat_payable` | IVA por pagar | 240802 |
| `vat_receivable` | IVA descontable | 240801 |
| `withholding_payable` | Retenciones por pagar | 2365 |
| `accounts_receivable` | CXC clientes | 1305 |
| `accounts_payable` | CXP proveedores | 2205 |
| `cash` | Caja general | 1105 |
| `bank` | Bancos | 1110 |

## Uso en Código

```typescript
// Obtener cuenta por key
const config = await prisma.accountingConfig.findUnique({
  where: { key: 'sales_income' },
  include: { account: true }
});

// config.account = ChartOfAccount con code, name, type, etc.
```

## Ubicación

- **Master:** Configuración base (se replica a cada tenant)
- **Tenant:** Cada empresa puede personalizar las cuentas asignadas

## Migración

```
prisma/migrations/20260130184828_add_accounting_config/
```
