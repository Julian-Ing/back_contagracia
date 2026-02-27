# Bank Accounts Module

## Descripción

Módulo para gestionar cuentas bancarias y cajas del tenant.

## Ubicación

`accounting-service/src/modules/bank-accounts/`

## Archivos

- `bank-accounts.module.ts` - Módulo NestJS
- `bank-accounts.controller.ts` - Controlador REST
- `bank-accounts.service.ts` - Servicio con lógica de negocio

## Endpoints

| Método | Endpoint             | Descripción                           | Permiso                |
| ------ | -------------------- | ------------------------------------- | ---------------------- |
| GET    | `/bank-accounts`     | Listar cuentas con paginación/filtros | `bank_accounts.view`   |
| GET    | `/bank-accounts/:id` | Obtener cuenta por ID                 | `bank_accounts.view`   |
| POST   | `/bank-accounts`     | Crear cuenta bancaria                 | `bank_accounts.create` |
| PUT    | `/bank-accounts/:id` | Actualizar cuenta                     | `bank_accounts.edit`   |
| DELETE | `/bank-accounts/:id` | Eliminar (soft delete)                | `bank_accounts.delete` |

## Query Parameters (GET)

- `search`: Búsqueda por nombre o número de cuenta
- `type`: Filtrar por tipo (SAVINGS, CHECKING, CASH)
- `page`: Número de página (default: 1)
- `limit`: Límite por página (default: 50)

## Tipos de Cuenta (BankAccountType)

```typescript
enum BankAccountType {
  SAVINGS   // Ahorros - requiere banco y número de cuenta
  CHECKING  // Corriente - requiere banco y número de cuenta
  CASH      // Caja - NO tiene banco ni número de cuenta
}
```

## Validaciones (Create/Update)

### Tipo SAVINGS o CHECKING:
- `bank_id`: Requerido, debe existir
- `account_number`: Requerido
- `account_id`: Si se proporciona, debe empezar con `1110` (Bancos)

### Tipo CASH:
- `bank_id`: No permitido (se ignora)
- `account_number`: No permitido (se ignora)
- `account_id`: Si se proporciona, debe empezar con `1105` (Caja)

## Modelo (Prisma)

```prisma
model BankAccount {
  id             String          @id @default(uuid())
  bank_id        String?
  account_number String?
  account_type   BankAccountType
  account_name   String
  account_id     String?         // FK a ChartOfAccount

  initial_balance Decimal @default(0)
  current_balance Decimal @default(0)

  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  bank Bank? @relation(fields: [bank_id], references: [id])
}
```

## Permisos Relacionados

- `bank_accounts.view` - Ver listado
- `bank_accounts.create` - Crear
- `bank_accounts.edit` - Editar
- `bank_accounts.delete` - Eliminar
- `accounting.bank_accounts.assign` - Asignar cuenta contable (frontend)
