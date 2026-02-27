# Cambiar columnas Débito/Crédito por Valor + Tipo en hoja Saldos

**Fecha:** 2026-02-25

## Cambio

En la plantilla Excel de importación de saldos iniciales, la hoja "Saldos" tenía dos columnas separadas (Débito y Crédito). Se reemplazaron por:
- **Valor**: monto numérico (siempre > 0)
- **Tipo**: dropdown con opciones "Débito" / "Crédito"

## Archivos modificados

- `accounting-service/src/modules/periods/opening-balance-template.service.ts` — columnas de la hoja Saldos + data validation para Tipo
- `accounting-service/src/modules/periods/opening-balance-import.service.ts` — interfaz `ParsedSaldoRow` (debit/credit → amount/type), parsing y construcción de items del JE
