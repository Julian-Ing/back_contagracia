# Sistema de Permisos y Rutas Protegidas

## Fecha: 2026-02-02

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  JWT contiene:                                               │
│  - permissions.modules: ['accounting', 'sales', ...]        │
│  - permissions.actions: ['chart_of_accounts.view', ...]     │
│                                                              │
│  Owner/Admin → reciben TODAS las acciones de sus módulos    │
│  Otros roles → reciben solo acciones de su rol + overrides  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                                                              │
│  usePermissions() hook:                                      │
│  - can(action) → verifica si action está en actions[]       │
│  - canAccessModule(module) → verifica si module está en     │
│    modules[]                                                 │
│                                                              │
│  Sidebar:                                                    │
│  - Filtra items según modules y actions del usuario         │
│                                                              │
│  ProtectedRoute:                                             │
│  - Wrapper que verifica permisos antes de renderizar        │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Creados

### 1. AccessDenied (`src/shared/components/auth/AccessDenied.tsx`)

Pantalla de acceso denegado con mensaje personalizable.

```tsx
<AccessDenied message="No tienes permisos para esta sección" />
```

### 2. ProtectedRoute (`src/shared/components/auth/ProtectedRoute.tsx`)

Wrapper para proteger rutas/componentes.

```tsx
// Verificar un permiso específico
<ProtectedRoute permission="chart_of_accounts.view">
  <ChartOfAccountsPage />
</ProtectedRoute>

// Verificar acceso a módulo
<ProtectedRoute module="accounting">
  <AccountingPage />
</ProtectedRoute>

// Verificar cualquiera de varios permisos (OR)
<ProtectedRoute anyPermission={['invoices.view', 'invoices.admin']}>
  <InvoicesPage />
</ProtectedRoute>

// Verificar todos los permisos (AND)
<ProtectedRoute allPermissions={['invoices.create', 'invoices.send']}>
  <CreateAndSendPage />
</ProtectedRoute>
```

## Hook usePermissions

```typescript
const {
  permissions,      // objeto con modules[] y actions[]
  role,             // rol del usuario (owner, admin, user, etc.)
  isPrivileged,     // true si es owner o admin
  can,              // verificar acción específica
  canAccessModule,  // verificar acceso a módulo
  canAny,           // verificar cualquiera de varias acciones
  canAll,           // verificar todas las acciones
} = usePermissions();

// Ejemplos
if (can('chart_of_accounts.view')) { ... }
if (canAccessModule('accounting')) { ... }
if (canAny(['invoices.view', 'invoices.admin'])) { ... }
```

## Navegación (Sidebar)

En `src/config/navigation.ts`, cada item puede tener:

```typescript
{
  id: 'contabilidad-modulo',
  label: 'Contabilidad',
  href: '/dashboard/accounting',
  icon: BookOpen,
  modules: ['accounting'],           // Módulos requeridos (OR)
  permission: 'accounting.view',     // Permiso específico requerido
}
```

La función `shouldShowNavItem()` verifica:
1. Si el usuario tiene alguno de los módulos requeridos
2. Si el usuario tiene el permiso específico (si está definido)

## Páginas de Contabilidad Creadas

| Ruta | Permiso |
|------|---------|
| `/dashboard/accounting` | `accounting.view` |
| `/dashboard/accounting/chart-of-accounts` | `chart_of_accounts.view` |
| `/dashboard/accounting/journal-entries` | `journal_entries.view` |
| `/dashboard/accounting/general-ledger` | `general_ledger.view` |
| `/dashboard/accounting/account-mapping` | `account_mapping.view` |
| `/dashboard/accounting/reports` | `reports.financial.view` |
| `/dashboard/accounting/bank-reconciliation` | `bank_reconciliation.view` |
| `/dashboard/accounting/tax-reports` | `tax_reports.view` |
| `/dashboard/accounting/resolutions` | `sales.resolutions.view` |
| `/dashboard/accounting/tax-withholdings` | `tax.rates.view` |
| `/dashboard/accounting/third-party-ledger` | `third_parties.ledger.view` |
| `/dashboard/accounting/accounts-ledger` | `auxiliary_books.view` |
| `/dashboard/accounting/closing` | `closing.view` |
| `/dashboard/accounting/exogenous` | `exogenous.view` |

## Fix: Login con Credenciales Inválidas

En `src/shared/services/api/apiClient.ts`:

El interceptor de respuestas ahora excluye endpoints públicos del flujo de refresh token:

```typescript
const publicEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/send-verification-code',
  '/auth/verify-code',
  '/passwords/forgot',
  '/passwords/verify-code',
  '/passwords/reset'
];
```

Esto evita que al fallar el login (401), el interceptor intente hacer refresh y redirija a la página principal.

## Archivos Modificados

- `src/shared/components/auth/AccessDenied.tsx` (nuevo)
- `src/shared/components/auth/ProtectedRoute.tsx` (nuevo)
- `src/shared/components/auth/index.ts` (nuevo)
- `src/shared/hooks/usePermissions.ts`
- `src/shared/components/layout/Sidebar.tsx`
- `src/config/navigation.ts`
- `src/shared/services/api/apiClient.ts`
- `src/app/dashboard/accounting/**/*.tsx` (14 páginas nuevas)
