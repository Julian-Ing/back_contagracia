# Fix visibilidad botón Importar Saldos y columna Acciones

**Fecha:** 2026-02-25

## Problema

1. El botón "Importar Saldos Iniciales" aparecía en períodos que ya tenían una acción de apertura automática (creada por el sistema al crear el período), incluso cuando esa acción no tenía asiento contable asociado ("Período creado - Sin asiento"). Esto bloqueaba la importación en períodos creados manualmente.
2. La columna "Acciones" en la tabla de historial se mostraba siempre, incluso vacía cuando no había acciones manuales.

## Fix

### Botón Importar
La condición ahora verifica si existe alguna acción OPEN con un `journal_entry_id` activo (no reversado), sin importar si es manual o automática. Solo aparece si:
- Período **anual** + status OPEN/REOPENED
- NO hay ninguna acción OPEN con asiento contable activo (ni automática ni manual)
- Si hay importaciones manuales previas pero todas están reversadas → se puede re-importar

La acción "Período creado" (sin asiento) ya no bloquea el botón. Períodos mensuales nunca muestran el botón.

### Columna Acciones
Se agregó `hasManualActions`: la columna "Acciones" (header + celdas) solo se renderiza si hay al menos una acción con `is_manual=true` en la página actual.

## Archivo modificado

- `src/modules/accounting/components/PeriodActionsModal.tsx`
