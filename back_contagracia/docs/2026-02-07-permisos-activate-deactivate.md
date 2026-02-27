# Permisos Activar/Desactivar - 2026-02-07

## Resumen

Se agregaron permisos granulares para activar y desactivar registros en los módulos de Bancos e Impuestos/Retenciones.

## Cambios en Permisos

### Módulo Banking (banking.ts)

Ya existían los permisos:
- `bank_accounts.activate` - Activar Cuenta (MEDIUM)
- `bank_accounts.deactivate` - Desactivar Cuenta (MEDIUM)

### Módulo Tax (tax.ts)

Se agregaron nuevos permisos:
- `tax.rates.activate` - Activar impuesto (MEDIUM)
- `tax.rates.deactivate` - Desactivar impuesto (MEDIUM)

Total de permisos del módulo: 15 → 17

## Cambios en Backend

### bank-accounts.controller.ts
- **Removidos** todos los decoradores `@RequirePermissions` del controlador
- Los permisos se validan en el frontend, no en el backend

### bank-accounts.service.ts
- Agregado parámetro `includeInactive` a `BankAccountsQueryParams`
- `findAll()` ahora filtra por `is_active: true` por defecto
- Con `includeInactive: true`, muestra todas las cuentas (activas e inactivas)

### taxes.service.ts
- `findAll()`: Agregado `is_active` al mapeo de respuesta
- `findOne()`: Agregado `is_active` al return
- `update()`: Agregado `is_active` al data y al return

### update-tax.dto.ts
- Agregado campo `is_active?: boolean`

## Lógica de Permisos en Frontend

### Bancos (BankAccountEditModal)
```typescript
// Solo muestra toggle si tiene el permiso correspondiente
{((account.is_active && canDeactivate) || (!account.is_active && canActivate)) && (
  <Switch checked={isActive} onCheckedChange={setIsActive} />
)}

// Solo envía is_active si tiene permiso
const canChangeStatus = (account.is_active && canDeactivate) || (!account.is_active && canActivate);
if (canChangeStatus) {
  data.is_active = isActive;
}
```

### Impuestos (TaxFormModal)
Misma lógica que bancos:
- Toggle visible solo si tiene permiso correspondiente
- Solo envía `is_active` si puede cambiar el estado

## Filtrado de Cuentas Inactivas

### Problema
Si el backend filtra `is_active: true` en findAll, las cuentas inactivas no aparecen en la tabla y no se pueden reactivar.

### Solución
- Parámetro `includeInactive` en el endpoint GET /bank-accounts
- La página de bancos pasa `includeInactive: true` para mostrar todas
- Los selects de otros formularios NO pasan el parámetro, así solo muestran activas

## Archivos Modificados

### Backend
- `accounting-service/src/modules/bank-accounts/bank-accounts.controller.ts`
- `accounting-service/src/modules/bank-accounts/bank-accounts.service.ts`
- `tax-service/src/modules/taxes/dto/update-tax.dto.ts`
- `tax-service/src/modules/taxes/taxes.service.ts`
- `contagracia-shared-modules/prisma/seeds/modules/actions/tax.ts`

### Frontend
- `src/modules/banking/types/index.ts`
- `src/modules/banking/services/bankAccounts.service.ts`
- `src/modules/banking/hooks/useBankAccounts.ts`
- `src/modules/banking/components/BankAccountsList.tsx`
- `src/modules/taxes/types/index.ts`
- `src/modules/taxes/components/TaxesList.tsx`
- `src/modules/taxes/components/TaxFormModal.tsx`
