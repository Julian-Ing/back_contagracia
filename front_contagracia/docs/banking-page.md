# Banking Page - Bancos y Cuentas

## Descripción

Página para gestionar cuentas bancarias y cajas.

## Ubicación

`src/app/dashboard/banking/page.tsx`

## Permisos

| Permiso | Uso |
| ------- | --- |
| `bank_accounts.view` | Ver la página |
| `bank_accounts.create` | Botón "Nueva Cuenta" |
| `accounting.bank_accounts.assign` | Ver selector de cuenta contable |

## Componentes Utilizados

- `ProtectedRoute` - Protección por permisos
- `AsyncSearchableSelect` - Selector de bancos
- `AccountSelect` - Selector de cuenta contable
- `Dialog` - Modal de creación
- `Button`, `Input`, `Label` - UI básica

## Formulario de Creación

### Campos

| Campo | Tipo | Condición | Requerido |
| ----- | ---- | --------- | --------- |
| `account_type` | Toggle (SAVINGS/CHECKING/CASH) | Siempre | Sí |
| `bank_id` | AsyncSearchableSelect | Solo si NO es CASH | Sí |
| `account_number` | Input | Solo si NO es CASH | Sí |
| `account_name` | Input | Siempre | Sí |
| `account_id` | AccountSelect | Solo si tiene permiso | No |

### Validaciones Frontend

```typescript
const isValid = (() => {
  if (!form.account_name.trim()) return false;
  if (!isCash && !form.bank_id) return false;
  if (!isCash && !form.account_number.trim()) return false;
  return true;
})();
```

### AccountSelect Prefixes

- Tipo CASH: `includePrefixes="1105"` (Caja)
- Otros tipos: `includePrefixes="1110"` (Bancos)

## Endpoints Consumidos

| Endpoint | Método | Uso |
| -------- | ------ | --- |
| `/banks` | GET | Cargar lista de bancos (AsyncSearchableSelect) |
| `/bank-accounts` | POST | Crear cuenta bancaria |

## Estado del Formulario

```typescript
interface BankAccountForm {
  account_type: 'SAVINGS' | 'CHECKING' | 'CASH';
  bank_id: string;
  bank_label: string;
  account_number: string;
  account_name: string;
  account_id: string;
  account_label: string;
}
```

## TODO

- [ ] Listado de cuentas bancarias
- [ ] Edición de cuentas
- [ ] Eliminación de cuentas
