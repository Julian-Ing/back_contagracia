# Opening Balance: Preview endpoint, CC movement fix, prepayment types English

**Fecha:** 2026-02-25

## Cambios

### 1. Preview endpoint (opening-balance-import.service.ts)
- Extraída lógica de parseo a método privado `parseExcel()` reutilizable
- Nuevo método público `previewOpeningBalance()` que parsea sin escribir en BD
- Retorna `ParseResult` con filas resueltas (nombres de cuenta, tercero, banco, CC) + errores
- Endpoint: `POST /accounting-periods/:id/preview-opening-balance` (multipart file)

### 2. Tipos de anticipo en inglés (opening-balance-import.service.ts)
- `ParsedPrepaymentRow.type` cambiado de `'Cliente' | 'Proveedor' | 'Empleado'` a `'customer' | 'supplier' | 'employee'`
- Mapeo desde valores españoles del Excel: `{ 'Cliente': 'customer', 'Proveedor': 'supplier', 'Empleado': 'employee' }`
- Comparación de totales actualizada: `row.type === 'customer'` en vez de `'Cliente'`

### 3. ParseResult exportado
- `export interface ParseResult` para que el controller pueda tipar el retorno público

### 4. createCostCenterMovement compilado (shared-modules)
- Faltaban `create-cost-center-movement.js` y `.d.ts` compilados
- `index.js` no tenía el `require()` de esta función → runtime error `is not a function`
- Compilado el `.ts` y agregado require en `index.js`

## Archivos modificados
- `accounting-service/src/modules/periods/opening-balance-import.service.ts`
- `accounting-service/src/modules/periods/periods.controller.ts`
- `contagracia-shared-modules/index.js`
- `contagracia-shared-modules/src/functions/create-cost-center-movement.js` (nuevo, compilado)
- `contagracia-shared-modules/src/functions/create-cost-center-movement.d.ts` (nuevo, compilado)
