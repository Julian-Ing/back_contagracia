# Sistema de Cuentas Bancarias y Movimientos

## Cuentas Bancarias

### Validaciones al Crear

| Campo | Validación |
|-------|------------|
| `account_type` | Requerido: SAVINGS, CHECKING o CASH |
| `bank_id` | Requerido si tipo es SAVINGS o CHECKING |
| `account_number` | Requerido si tipo es SAVINGS o CHECKING. Solo dígitos numéricos |
| `account_name` | Requerido |
| `account_id` | **Requerido si la compañía tiene módulo de contabilidad** |
| `counterpart_account_id` | Requerido si hay saldo inicial |

### Tipos de Cuenta

| Tipo | Descripción | Cuenta Contable |
|------|-------------|-----------------|
| `SAVINGS` | Cuenta de Ahorros | 1110* |
| `CHECKING` | Cuenta Corriente | 1110* |
| `CASH` | Caja | 1105* |

### Backend

#### Servicio: `bank-accounts.service.ts`

Ubicación: `accounting-service/src/modules/bank-accounts/`

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/bank-accounts` | Listar cuentas bancarias |
| GET | `/bank-accounts/:id` | Obtener detalle |
| POST | `/bank-accounts` | Crear cuenta bancaria |
| PUT | `/bank-accounts/:id` | Actualizar cuenta |
| DELETE | `/bank-accounts/:id` | Eliminar (soft delete) |

#### Crear Cuenta Bancaria

```typescript
// POST /bank-accounts
{
  "account_type": "SAVINGS",
  "bank_id": "uuid-banco",
  "account_number": "123456789",
  "account_name": "Cuenta Principal",
  "account_id": "111005",           // Cuenta contable
  "initial_balance": 5000000,       // Saldo inicial
  "counterpart_account_id": "3105"  // Contrapartida para asiento
}
```

**Nota:** El `current_balance` inicia en 0. El `initial_balance` se registra mediante un asiento contable que crea el movimiento bancario correspondiente.

### Frontend

#### Componente: `BankAccountsList`

Ubicación: `src/modules/banking/components/BankAccountsList.tsx`

#### Props

```typescript
interface BankAccountsListProps {
  canEdit: boolean;           // Puede editar cuentas
  canViewMovements: boolean;  // Puede ver movimientos
  hasAccountingModule: boolean; // Mostrar cuenta contable
  onEdit?: (account: BankAccount) => void;
}
```

#### Características

- Tabla con: Cuenta, Tipo, Banco, Número, Saldo, Estado, Acciones
- Iconos por tipo (Wallet, Banknote, Building2)
- Colores por tipo (amber=caja, blue=ahorros, green=corriente)
- Búsqueda por nombre o número
- Filtro por tipo
- Paginación
- Botón "Ver Movimientos" abre modal

## Movimientos Bancarios

### Backend

#### Servicio: `bank-movements.service.ts`

Ubicación: `accounting-service/src/modules/bank-movements/`

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/bank-movements` | Listar movimientos |
| GET | `/bank-movements/:id` | Obtener detalle |

#### Filtros

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `bank_account_id` | string | **Requerido** - ID de la cuenta |
| `search` | string | Buscar por consecutivo/descripción |
| `type_key` | string | Filtrar por tipo |
| `from_date` | string | Fecha desde |
| `to_date` | string | Fecha hasta |
| `page` | number | Página |
| `limit` | number | Límite |

### Función: `createBankMovement`

Ubicación: `accounting-service/src/functions/create-bank-movement.ts`

```typescript
import { createBankMovement } from '../functions';

const result = await createBankMovement(tenantContext, companyId, {
  bank_account_id: 'uuid',
  transaction_date: new Date(),
  amount: 500000,        // Positivo = ingreso, Negativo = egreso
  type_key: 'manual',
  description: 'Depósito en efectivo',
  reference_id: 'uuid-asiento',
  reference_type: 'journal_entry',
  reference_consecutive: 'JE-000001',
});

console.log(result.consecutive);   // MB-000001
console.log(result.new_balance);   // 500000
```

#### Funcionamiento

1. Valida cuenta bancaria existe y está activa
2. Valida tipo de movimiento existe
3. Calcula nuevo saldo
4. En transacción:
   - Obtiene consecutivo con `getNextConsecutive`
   - Crea el movimiento
   - Actualiza `current_balance` de la cuenta

### Frontend

#### Componente: `BankMovementsModal`

Ubicación: `src/modules/banking/components/BankMovementsModal.tsx`

Modal que muestra los movimientos de una cuenta bancaria específica.

#### Props

```typescript
interface BankMovementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount: BankAccount;
}
```

## Flujo de Saldo Inicial

Cuando se crea una cuenta bancaria con saldo inicial:

1. Se crea `BankAccount` con `current_balance: 0`
2. Se crea asiento contable tipo `bank_account_opening`:
   - DÉBITO: Cuenta bancaria (1110* o 1105*)
   - CRÉDITO: Cuenta contrapartida
3. El asiento crea automáticamente un `BankMovement`
4. El movimiento actualiza `current_balance` de la cuenta

Esto evita duplicar el saldo y mantiene la integridad contable.
