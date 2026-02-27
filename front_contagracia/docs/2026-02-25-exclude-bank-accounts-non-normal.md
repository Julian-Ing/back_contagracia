# Ocultar cuentas 1105/1110 en líneas no-NORMAL del asiento manual

**Fecha:** 2026-02-25

## Problema

En el formulario de asiento manual, al crear líneas de tipo CxC, CxP o Anticipo (reference_type distinto de NORMAL), el dropdown de cuentas mostraba todas las cuentas incluyendo 1105 (Caja) y 1110 (Bancos). Estas cuentas no son válidas para esos tipos de línea y el backend las rechazaría.

## Fix

Se agregó la prop `excludePrefixes` al `AccountSelect` en las líneas del asiento manual. Cuando la línea tiene un `reference_type` distinto de `NORMAL`, se pasan los prefijos `1105,1110` para filtrar esas cuentas del dropdown.

```tsx
<AccountSelect
  ...
  excludePrefixes={line.reference_type !== 'NORMAL' ? '1105,1110' : undefined}
/>
```

## Archivo modificado

- `src/app/dashboard/accounting/journal-entries/new/page.tsx` — AccountSelect en líneas del formulario
