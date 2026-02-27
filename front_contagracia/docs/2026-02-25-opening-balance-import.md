# Importación de Saldos Iniciales — Frontend

**Fecha:** 2026-02-25

## Contexto

UI para importar saldos iniciales desde Excel en periodos anuales abiertos, y reversar importaciones previas.

## Tipos nuevos

### `accountingPeriods.ts`
- `AccountingPeriodAction`: agrega `is_manual: boolean`, `journal_entry_is_reversed: boolean | null`
- `OpeningBalanceImportResult`: respuesta del import (journal_entry_id, consecutive, conteos)
- `ReverseOpeningBalanceResult`: respuesta del reverse (reversal_journal_entry_id, reversal_consecutive)

## Servicio

### `accountingPeriods.service.ts` — métodos nuevos
- `downloadOpeningBalanceTemplate(periodId)` → GET blob, descarga Excel
- `importOpeningBalance(periodId, file, description?)` → POST multipart
- `reverseOpeningBalance(periodId, actionId)` → POST

## UI — PeriodActionsModal

### Botón "Importar Saldos Iniciales"
- Visible solo si: periodo anual + status OPEN/REOPENED + no tiene importación activa (is_manual con JE no reversado)
- Abre dialog con:
  - Campo descripción (default: "Saldos iniciales {año}")
  - Botón descargar plantilla Excel
  - Input file para subir Excel (.xlsx)
  - Botón Importar con spinner

### Badges en filas de acciones
- Badge "Manual" para acciones con `is_manual=true`
- Badge "Reversado" (rojo) para acciones con JE reversado

### Columna "Acciones"
- Botón reversar (Undo2 icon, rojo) para acciones manuales OPEN con JE activo
- AlertDialog de confirmación antes de reversar

### Manejo de errores
- Errores de validación del Excel se muestran en toast con las primeras 5 líneas

## Archivos modificados

- `src/modules/accounting/types/accountingPeriods.ts`
- `src/modules/accounting/services/accountingPeriods.service.ts`
- `src/modules/accounting/components/PeriodActionsModal.tsx`
