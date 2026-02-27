# Forzar tipo débito/crédito en PREP_CREATED según tipo de anticipo

**Fecha:** 2026-02-25

## Bug

En el formulario de asiento manual, al seleccionar "Crear Anticipo" y cambiar el sub-tipo (Cliente/Proveedor/Empleado), no se forzaba el tipo de línea correcto. El usuario podía tener un anticipo de Cliente en línea Débito (incorrecto) o Proveedor en Crédito (incorrecto). El backend rechazaba pero la UI no prevenía el error.

## Fix

En `updateLine`, cuando `reference_type` cambia a un `PREP_CREATED_*`, se fuerza automáticamente el tipo:
- `PREP_CREATED_CLIENT` → `type = 'CREDIT'`
- `PREP_CREATED_SUPPLIER` → `type = 'DEBIT'`
- `PREP_CREATED_EMPLOYEE` → `type = 'DEBIT'`

Aplica tanto al seleccionar PREP_CREATED por primera vez (default CLIENT) como al cambiar el sub-tipo.

## Archivo modificado

- `src/app/dashboard/accounting/journal-entries/new/page.tsx` — `updateLine()`
