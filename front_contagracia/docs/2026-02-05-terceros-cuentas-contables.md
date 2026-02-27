# Cuentas Contables en Terceros

**Fecha:** 2026-02-05

## Funcionalidad

Los terceros pueden tener cuentas CxC (Cuentas por Cobrar) y CxP (Cuentas por Pagar) asignadas, controladas por el permiso `third_parties.accounts.assign`.

## Permiso Requerido

```
third_parties.accounts.assign
```

## Comportamiento

### Con Permiso

1. **Selectores visibles**: Se muestran los campos de Cuenta CxC y Cuenta CxP
2. **Precarga automática**: Al abrir el form (crear o editar), si las cuentas están vacías, se cargan los valores por defecto desde:
   - `finance_cxc` → Cuenta CxC
   - `finance_cxp` → Cuenta CxP
3. **Validación**: Las cuentas son requeridas para guardar
4. **Crear cuenta**: Botón "+" permite crear cuenta inline sin salir del form

### Sin Permiso

- Los selectores de cuentas no se muestran
- El tercero se guarda sin cuentas contables
- No se hace precarga de valores por defecto

## Servicio accountingConfigService

Nuevo método para obtener configuración por key:

```typescript
accountingConfigService.getByKey('finance_cxc')
// Retorna: AccountingConfigItem | null
```

## Prefijos de Cuentas

| Tipo | Prefijo | Descripción |
|------|---------|-------------|
| CxC | 13 | Cuentas por Cobrar (Activos) |
| CxP | 2 | Pasivos |

## Archivos Modificados

- `src/modules/accounting/services/accountingConfig.service.ts`
- `src/modules/third-parties/components/ThirdPartyForm.tsx`
