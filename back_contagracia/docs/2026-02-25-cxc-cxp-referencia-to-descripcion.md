# Fix: Renombrar Referencia → Descripción en hojas CxC/CxP

**Fecha:** 2026-02-25

## Problema

La columna "Referencia" en las hojas CxC y CxP de la plantilla de importación de saldos iniciales era confusa. El usuario podía pensar que era una referencia interna del sistema (como el consecutivo del asiento), pero en realidad es un campo opcional de texto libre para describir cada CxC/CxP (ej: "Factura #123", "Saldo anterior").

## Solución

Renombrar la columna de "Referencia" a "Descripción" en template e import service. El campo se mapea a `description` del item del JE.

## Archivos modificados

- `accounting-service/src/modules/periods/opening-balance-template.service.ts` — header de columna
- `accounting-service/src/modules/periods/opening-balance-import.service.ts` — interfaz `ParsedCxRow`, parsing y mapping
