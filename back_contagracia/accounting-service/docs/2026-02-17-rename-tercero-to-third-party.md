# Renombre tercero → thirdParty en AR/AP

## Resumen

Se renombraron los identificadores `terceroId` a `thirdPartyId` en el controlador y servicio de AR/AP del accounting-service.

## Archivos modificados

### ar-ap.controller.ts

- Ruta `:terceroId` → `:thirdPartyId`
- Parametro `@Param('terceroId')` → `@Param('thirdPartyId')`
- Uso en llamada al servicio

### ar-ap.service.ts

- Parametro `terceroId: string` → `thirdPartyId: string` en metodos de detalle
- Variable `lastPaymentByTercero` → `lastPaymentByThirdParty`

## Nota

El frontend fue actualizado en el mismo commit para usar los nuevos nombres de ruta.
