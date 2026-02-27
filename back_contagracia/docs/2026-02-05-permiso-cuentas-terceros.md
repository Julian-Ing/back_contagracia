# Permiso para Asignar Cuentas Contables a Terceros

**Fecha:** 2026-02-05

## Nuevo Permiso

Se agregó el permiso `third_parties.accounts.assign` para controlar quién puede asignar cuentas CxC/CxP a terceros.

### Definición

```typescript
{
  action_key: 'third_parties.accounts.assign',
  action_name: 'Asignar Cuentas Contables',
  description: 'Asignar cuentas CxC/CxP a terceros',
  risk_level: RiskLevel.MEDIUM
}
```

### Comportamiento en Frontend

Si el usuario **tiene** el permiso:
- Ve los selectores de Cuenta CxC y Cuenta CxP
- Se precargan las cuentas por defecto desde `finance_cxc` y `finance_cxp` del accounting config
- Las cuentas son requeridas para guardar

Si el usuario **no tiene** el permiso:
- No ve los selectores de cuentas
- Puede crear/editar terceros sin asignar cuentas
- Las cuentas no se envían en el payload

## Archivos Modificados

### Backend
- `prisma/seeds/modules/actions/third_parties.ts` - Nuevo permiso

### Frontend
- `src/modules/accounting/services/accountingConfig.service.ts` - Método `getByKey()`
- `src/modules/third-parties/components/ThirdPartyForm.tsx` - Lógica condicional por permiso

## Configuración de Cuentas por Defecto

Las cuentas se precargan desde el accounting config:

| Key | Descripción | Default |
|-----|-------------|---------|
| `finance_cxc` | Cuentas por Cobrar | 13050501 |
| `finance_cxp` | Cuentas por Pagar | 22050501 |

Si estas configuraciones no tienen cuenta asignada, los campos quedarán vacíos y el usuario deberá seleccionar manualmente.
