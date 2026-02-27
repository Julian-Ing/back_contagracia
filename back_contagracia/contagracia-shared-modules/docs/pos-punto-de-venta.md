# POS - Punto de Venta

## Descripcion

Sistema de punto de venta para facturación rápida en mostrador. Permite gestionar cajas registradoras, sesiones de caja y movimientos de efectivo.

## Tablas

### cash_registers (Cajas Registradoras)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| consecutive | varchar | CA-0001 |
| name | varchar | Nombre de la caja (ej: "Caja 1") |
| description | text? | Descripcion opcional |
| cash_account_id | uuid FK | → bank_accounts.id (cuenta efectivo, REQUERIDA) |
| allowed_bank_accounts | jsonb | [{bank_account_id, name}] cuentas permitidas para cobrar |
| storage_id | uuid FK? | → storages.id (bodega asociada) |
| cost_center_id | uuid FK? | → cost_centers.id |
| resolution_id | uuid FK? | → resolutions.id (para fact. electrónica) |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### cash_sessions (Sesiones de Caja)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| consecutive | varchar | SC-0001 |
| cash_register_id | uuid FK | → cash_registers.id |
| opened_by | uuid FK | → tenant_users.id |
| closed_by | uuid FK? | → tenant_users.id |
| opened_at | timestamptz | |
| closed_at | timestamptz? | NULL mientras está abierta |
| opening_amount | decimal(19,4) | Base de caja inicial |
| closing_amount | decimal(19,4)? | Conteo físico final |
| expected_amount | decimal(19,4)? | Calculado por sistema |
| difference | decimal(19,4)? | closing - expected |
| status | enum | open, closed |
| notes | text? | |

### cash_movements (Movimientos de Caja)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| consecutive | varchar | MC-0001 |
| cash_session_id | uuid FK | → cash_sessions.id |
| movement_type | enum | invoice, expense |
| document_id | uuid FK | → documents.id |
| third_party_id | uuid FK | → third_parties.id |
| cxc_amount | decimal(19,4) | Monto que queda a crédito (CxC) |
| payments | jsonb | [{bank_account_id, amount}] distribución de pagos |
| movement_time | timestamptz | |
| created_at | timestamptz | |

## Consecutive Types

```typescript
{ type: 'invoice_pos', default_prefix: 'POS', description: 'Factura POS' },
{ type: 'cash_register', default_prefix: 'CA', description: 'Caja Registradora' },
{ type: 'cash_session', default_prefix: 'SC', description: 'Sesión de Caja' },
{ type: 'cash_movement', default_prefix: 'MC', description: 'Movimiento de Caja' },
```

## Relaciones

```
cash_registers
├── cash_account → BankAccount (cuenta efectivo)
├── storage → Storage (bodega)
├── cost_center → CostCenter
├── resolution → Resolution
└── sessions → CashSession[]

cash_sessions
├── cash_register → CashRegister
├── opened_by → TenantUser
├── closed_by → TenantUser
└── movements → CashMovement[]

cash_movements
├── cash_session → CashSession
├── document → Document
└── third_party → ThirdParty
```

## Flujo de Uso

1. **Configurar Caja**: Crear cash_register con cuenta efectivo y bancos permitidos
2. **Abrir Sesión**: Cajero abre cash_session con monto base (opening_amount)
3. **Ventas POS**: Crear documents con doc_type='INVOICE_POS', luego crear cash_movement que vincula el documento a la sesión
4. **Pagos**: El campo `payments` registra cómo se distribuyó el pago entre cuentas
5. **Crédito**: Si hay monto a crédito, se registra en cxc_amount
6. **Cierre**: Al cerrar sesión, se hace conteo físico (closing_amount) y se calcula diferencia

## Campo allowed_bank_accounts

Ejemplo de estructura:
```json
[
  {"bank_account_id": "uuid-1", "name": "Efectivo"},
  {"bank_account_id": "uuid-2", "name": "Bancolombia"},
  {"bank_account_id": "uuid-3", "name": "Nequi"}
]
```

## Campo payments en Movimientos

Ejemplo de distribución de pago:
```json
[
  {"bank_account_id": "uuid-1", "amount": 50000},
  {"bank_account_id": "uuid-2", "amount": 30000}
]
```

## Archivos

- `prisma/schema-tenant.prisma` - Modelos CashRegister, CashSession, CashMovement
- `prisma/seeds/consecutiveTypes.ts` - Tipos de consecutivo
- `docs/pos-punto-de-venta.md` - Esta documentación

## Estado

IMPLEMENTADO - Modelos creados en Prisma, migraciones aplicadas a tenants.
