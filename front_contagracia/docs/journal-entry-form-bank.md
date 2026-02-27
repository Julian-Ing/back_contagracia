# Columna Banco/Caja en Formulario de Asientos

## Fecha: 2026-02-06

## Descripción

El formulario de nuevo asiento contable ahora incluye una columna para seleccionar cuenta bancaria/caja cuando la cuenta contable lo requiere.

## Comportamiento

| Cuenta Contable | Campo Banco/Caja | Opciones Disponibles |
|-----------------|------------------|---------------------|
| 1110* (Bancos)  | Requerido        | Solo SAVINGS/CHECKING |
| 1105* (Caja)    | Requerido        | Solo CASH |
| Otras           | Deshabilitado    | — |

## Flujo

1. Usuario selecciona cuenta contable
2. Si es 1110* o 1105*, se habilita el select de banco/caja
3. El select carga cuentas bancarias filtradas según el tipo
4. El campo es requerido para poder guardar
5. Al guardar, se envía `bank_account_id` en cada línea

## Componentes Usados

- `AsyncSearchableSelect` para el select de banco/caja
- Función `loadBankAccounts(filterType)` para cargar opciones filtradas
- Función `getBankAccountRequirement(accountCode)` para determinar si aplica

## Validación

El botón "Guardar" se deshabilita si:
- Hay líneas con cuenta 1110*/1105* sin banco/caja seleccionado

## Archivo Modificado

`src/app/dashboard/accounting/journal-entries/new/page.tsx`
