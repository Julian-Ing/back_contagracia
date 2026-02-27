# Módulo de Contabilidad - Frontend

## Descripción

Módulo para la gestión contable, incluyendo el Plan de Cuentas (PUC).

## Estructura de Archivos

```
src/
├── app/dashboard/accounting/
│   └── chart-of-accounts/
│       └── page.tsx              # Página del Plan de Cuentas
├── modules/accounting/
│   ├── types/
│   │   └── index.ts              # Tipos TypeScript
│   ├── services/
│   │   └── chartOfAccounts.service.ts  # Servicio API
│   ├── hooks/
│   │   └── useChartOfAccounts.ts # Hook principal
│   └── index.ts                  # Exports del módulo
```

## Plan de Cuentas

### Página

**Ruta:** `/dashboard/accounting/chart-of-accounts`

**Permiso requerido:** `chart_of_accounts.view`

**Características:**
- Vista en árbol jerárquico con cuentas expandibles
- Búsqueda por código o nombre (con debounce de 300ms)
- Filtro por tipo de cuenta usando SearchableSelect
- Las cuentas que coinciden con la búsqueda se resaltan en amarillo
- Indicador de cuentas filtradas vs total
- Botón de agregar cuenta (requiere `chart_of_accounts.create`)
- Botón de editar cuenta por fila (requiere `chart_of_accounts.edit`)
- Botón de eliminar cuenta por fila (requiere `chart_of_accounts.delete`)

### Hook: useChartOfAccounts

```typescript
import { useChartOfAccounts } from '@/modules/accounting';

const {
  accounts,      // ChartOfAccountNode[] - Árbol de cuentas
  total,         // number - Total de cuentas
  filtered,      // number | undefined - Cuentas filtradas
  loading,       // boolean
  error,         // string | null
  search,        // string - Término de búsqueda
  setSearch,     // (value: string) => void
  typeFilter,    // string - Filtro de tipo
  setTypeFilter, // (value: string) => void
  page,          // number - Página actual
  totalPages,    // number - Total de páginas
  goToPage,      // (page: number) => void
  refetch,       // () => void - Recargar datos
  resetFilters,  // () => void - Limpiar filtros
  deleteAccount, // (code: string) => Promise - Eliminar cuenta
} = useChartOfAccounts();
```

### Servicio: chartOfAccountsService

```typescript
import { chartOfAccountsService } from '@/modules/accounting';

// Obtener cuentas con filtros
const response = await chartOfAccountsService.getAll({
  search: 'caja',      // Buscar por código o nombre
  type: 'ASSET',       // Filtrar por tipo
  page: 1,             // Página
  limit: 100,          // Límite por página
});

// Obtener una cuenta
const account = await chartOfAccountsService.getOne('1105');

// Verificar si existe
const { exists, account } = await chartOfAccountsService.exists('1105');

// Crear cuenta
const newAccount = await chartOfAccountsService.create({
  code: '110505',
  name: 'Caja General',
});

// Actualizar cuenta (solo nombre)
const updated = await chartOfAccountsService.update('110505', {
  name: 'Caja Principal',
});

// Eliminar cuenta
await chartOfAccountsService.delete('1105');
```

### Utilidades: accountCode.utils

```typescript
import {
  detectAccountType,
  getParentCode,
  getAccountLevel,
  getAccountLevelName,
  isValidAccountCode,
  isValidCodeLength,
  getAncestorCodes,
} from '@/modules/accounting';

// Detectar tipo según primer dígito
detectAccountType('110505'); // 'ASSET'

// Obtener código padre
getParentCode('110505'); // '1105'
getParentCode('1105');   // '11'
getParentCode('11');     // '1'
getParentCode('1');      // null

// Obtener nivel
getAccountLevel('1');      // 1 (Clase)
getAccountLevel('11');     // 2 (Grupo)
getAccountLevel('1105');   // 3 (Cuenta)
getAccountLevel('110505'); // 4 (Subcuenta)
getAccountLevel('11050501'); // 5 (Auxiliar)

// Validar código
isValidAccountCode('110505'); // true
isValidAccountCode('11050');  // false (longitud 5 no válida)

// Obtener ancestros
getAncestorCodes('110505'); // ['1', '11', '1105']
```

### Componente: AccountForm

```typescript
import { AccountForm } from '@/modules/accounting';

<AccountForm
  mode="create"  // o "edit"
  initialData={{ code: '1105', name: 'Caja' }}  // solo para edit
  onSuccess={() => console.log('Guardado')}
  onCancel={() => console.log('Cancelado')}
/>
```

**Características:**
- Detecta automáticamente tipo y padre según el código
- Valida longitud de código (solo 1, 2, 4, 6, 8... dígitos)
- Verifica en tiempo real si el código ya existe (muestra nombre si existe)
- Verifica si la cuenta padre existe
- Si el padre no existe, permite crearla recursivamente
- Muestra breadcrumb cuando hay creación recursiva en progreso
- En modo edición solo permite modificar el nombre

### Eliminar Cuenta

- Botón de eliminar aparece al hacer hover sobre una fila
- Modal de confirmación con AlertDialog
- Validaciones del backend:
  - No puede tener subcuentas activas
  - No puede estar en uso en configuración contable
  - No puede tener movimientos contables
- Usa `react-hot-toast` para notificaciones

### Tipos

```typescript
type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'INCOME'
  | 'EXPENSE'
  | 'COST'
  | 'PRODUCTION_COST'
  | 'DEBTOR_ACCOUNTS'
  | 'CREDITOR_ACCOUNTS';

interface ChartOfAccountNode {
  code: string;
  name: string;
  type: AccountType;
  parent_code: string | null;
  children: ChartOfAccountNode[];
  _matched?: boolean;  // true si coincide con la búsqueda
}

interface ChartOfAccountsResponse {
  data: ChartOfAccountNode[];
  total: number;
  filtered?: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Configuración

**API URL:** Configurada en `.env`

```env
NEXT_PUBLIC_ACCOUNTING_SERVICE_URL=http://localhost:3010/api
```

**api.config.ts:**

```typescript
ACCOUNTING: process.env.NEXT_PUBLIC_ACCOUNTING_SERVICE_URL || 'http://localhost:3010/api'
```

## Componentes Utilizados

- `ProtectedRoute` - Control de acceso por permisos
- `SearchableSelect` - Select con búsqueda para filtro de tipo
- `Button` - Botón de agregar cuenta
- `AlertDialog` - Modal de confirmación para eliminar
- `Dialog` - Modales de crear y editar cuenta
- `usePermissions` - Hook para verificar permisos
- Iconos de `lucide-react`: ListTree, ChevronRight, ChevronDown, Plus, Loader2, Search, Trash2, Pencil

## Estilos

Los tipos de cuenta tienen colores distintivos:

| Tipo              | Color de fondo              |
|-------------------|----------------------------|
| ASSET             | Azul                       |
| LIABILITY         | Rojo                       |
| EQUITY            | Púrpura                    |
| INCOME            | Verde                      |
| EXPENSE           | Naranja                    |
| COST              | Amarillo                   |
| PRODUCTION_COST   | Ámbar                      |
| DEBTOR_ACCOUNTS   | Cian                       |
| CREDITOR_ACCOUNTS | Rosa                       |

Las cuentas que coinciden con la búsqueda se resaltan con fondo amarillo claro.

## Permisos

| Permiso                     | Descripción                          |
|-----------------------------|--------------------------------------|
| `chart_of_accounts.view`    | Ver el plan de cuentas               |
| `chart_of_accounts.create`  | Crear nuevas cuentas                 |
| `chart_of_accounts.edit`    | Editar cuentas existentes            |
| `chart_of_accounts.delete`  | Eliminar cuentas                     |

Los botones de acción (crear, editar, eliminar) solo se muestran si el usuario tiene el permiso correspondiente.
