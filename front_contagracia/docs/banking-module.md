# Módulo Banking (Cuentas Bancarias)

## Fecha: 2026-02-05

## Descripción

Página de gestión de cuentas bancarias con lista, búsqueda fuzzy, paginación, colores por tipo y modal de movimientos.

## Componentes

### BankAccountsList

Lista de cuentas bancarias con:
- Búsqueda fuzzy por nombre o número de cuenta
- Filtro por tipo (Ahorros, Corriente, Caja)
- Paginación (20 por página)
- Colores por tipo de cuenta
- Botón "Ver Movimientos" (requiere permiso)
- Botón "Editar" (requiere permiso)

**Props:**
```typescript
interface BankAccountsListProps {
  canEdit: boolean;
  canViewMovements: boolean;
  onEdit?: (account: BankAccount) => void;
}
```

### BankMovementsModal

Modal para ver movimientos de una cuenta bancaria:
- Búsqueda por consecutivo, descripción o referencia
- Paginación (15 por página)
- Colores por tipo de movimiento (verde=ingresos, rojo=egresos, azul=bancarios)
- Iconos indicadores de entrada/salida

**Props:**
```typescript
interface BankMovementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount: BankAccount;
}
```

## Hooks

### useBankAccounts

```typescript
const {
  bankAccounts,    // BankAccount[]
  total,           // number
  page,            // number
  totalPages,      // number
  loading,         // boolean
  error,           // string | null
  search,          // (term: string) => void
  filterByType,    // (type: BankAccountType | undefined) => void
  setPage,         // (page: number) => void
  refetch,         // () => void
} = useBankAccounts({ limit: 20 });
```

### useBankMovements

```typescript
const {
  movements,       // BankMovement[]
  total,           // number
  page,            // number
  totalPages,      // number
  loading,         // boolean
  error,           // string | null
  search,          // (term: string) => void
  setPage,         // (page: number) => void
  refetch,         // () => void
} = useBankMovements({
  bankAccountId: 'uuid',
  limit: 20,
  enabled: true,
});
```

## Servicios

### bankAccountsService

- `getAll(filters)` - Lista con búsqueda y paginación
- `getOne(id)` - Obtener por ID
- `create(data)` - Crear cuenta
- `update(id, data)` - Actualizar
- `delete(id)` - Eliminar (soft delete)

### bankMovementsService

- `getAll(filters)` - Lista movimientos de una cuenta
- `getOne(id)` - Obtener movimiento por ID

## Tipos

### BankAccountType

```typescript
type BankAccountType = 'SAVINGS' | 'CHECKING' | 'CASH';
```

### Colores por Tipo

```typescript
const BANK_ACCOUNT_TYPE_COLORS = {
  SAVINGS: 'bg-blue-100 text-blue-800',    // Azul
  CHECKING: 'bg-green-100 text-green-800', // Verde
  CASH: 'bg-amber-100 text-amber-800',     // Ámbar
};
```

### Colores de Movimientos

- **Ingresos** (verde): Cobros, anticipos de clientes
- **Egresos** (rojo): Pagos, anticipos a proveedores
- **Bancarios** (azul): Transferencias, ajustes
- **Otros** (gris): Manuales, reversiones

## Permisos

| Acción | Permiso |
|--------|---------|
| Ver cuentas | `bank_accounts.view` |
| Crear cuenta | `bank_accounts.create` |
| Editar cuenta | `bank_accounts.edit` |
| Ver movimientos | `bank_transactions.view` |
| Asignar cuenta contable | `accounting.bank_accounts.assign` |

## Archivos

```
src/modules/banking/
├── components/
│   ├── BankAccountsList.tsx
│   └── BankMovementsModal.tsx
├── hooks/
│   ├── useBankAccounts.ts
│   └── useBankMovements.ts
├── services/
│   ├── bankAccounts.service.ts
│   └── bankMovements.service.ts
├── types/
│   └── index.ts
└── index.ts

src/app/dashboard/banking/
└── page.tsx
```

## Uso

```typescript
import { BankAccountsList } from '@/modules/banking';

<BankAccountsList
  canEdit={can('bank_accounts.edit')}
  canViewMovements={can('bank_transactions.view')}
  onEdit={handleEdit}
/>
```
