# Endpoints Internos de Contabilidad

## Descripcion

Endpoints de desarrollo para visualizar y debugear las tablas de PUC y configuracion contable en la base master.

## Base URL

```
http://localhost:3003/_internal
```

## Endpoints

### GET /_internal/puc

Retorna el Plan Unico de Cuentas en formato arbol y plano.

**Response:**
```json
{
  "total": 172,
  "tree": [
    {
      "code": "1",
      "name": "Activo",
      "type": "ASSET",
      "is_active": true,
      "children": [
        {
          "code": "11",
          "name": "Efectivo y equivalentes",
          "type": "ASSET",
          "children": [...]
        }
      ]
    }
  ],
  "flat": [
    { "code": "1", "name": "Activo", "type": "ASSET", "parent_code": null },
    { "code": "11", "name": "Efectivo...", "type": "ASSET", "parent_code": "1" }
  ]
}
```

### GET /_internal/accounting-config

Retorna las configuraciones contables con sus cuentas asignadas.

**Response:**
```json
{
  "total": 99,
  "configs": [
    {
      "key": "sales_iva",
      "description": "IVA Ventas",
      "default": "24080501",
      "default_debit": null,
      "default_credit": null,
      "account": {
        "code": "24080501",
        "name": "IVA generado por ventas",
        "type": "LIABILITY"
      },
      "debit_account": null,
      "credit_account": null
    },
    {
      "key": "payroll_salary",
      "description": "Salario",
      "default": null,
      "default_debit": "510505",
      "default_credit": "250505",
      "account": null,
      "debit_account": {
        "code": "510505",
        "name": "Sueldos",
        "type": "EXPENSE"
      },
      "credit_account": {
        "code": "250505",
        "name": "Salarios por pagar",
        "type": "LIABILITY"
      }
    }
  ]
}
```

### GET /_internal/full-view

Retorna ambos endpoints combinados para una vista completa.

**Response:**
```json
{
  "puc": { ... },
  "configs": { ... }
}
```

## Tipos de Configuracion

### Configuracion Simple
Para conceptos que usan una sola cuenta (ventas, compras, inventario, finanzas):
- `account` - Cuenta asignada
- `default` - Codigo por defecto

### Configuracion Doble (Nomina)
Para conceptos que requieren debito y credito:
- `debit_account` - Cuenta de debito asignada
- `credit_account` - Cuenta de credito asignada
- `default_debit` - Codigo debito por defecto
- `default_credit` - Codigo credito por defecto

## Implementacion

Archivo: `src/modules/internal/internal.service.ts`

```typescript
async getAccountingConfigs() {
  const configs = await this.prisma.accountingConfig.findMany({
    include: {
      account: { select: { code, name, type } },
      debit_account: { select: { code, name, type } },
      credit_account: { select: { code, name, type } },
    },
    orderBy: { key: 'asc' },
  });
  // ...
}
```
