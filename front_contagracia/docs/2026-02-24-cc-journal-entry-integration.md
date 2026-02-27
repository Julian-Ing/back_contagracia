# Integración Centro de Costos con Asientos Manuales - Frontend

**Fecha:** 2026-02-24

## Resumen

Cuando la compañía tiene el módulo `cost_centers`, el formulario de nuevo asiento manual muestra una sub-fila debajo de cada línea con selección jerárquica de centro de costos y tipo de movimiento.

## Archivos modificados

### `app/dashboard/accounting/journal-entries/new/page.tsx`

**Nuevos campos en JournalEntryLine:**
- `cost_center_id` — ID del CC seleccionado (el más profundo en la jerarquía)
- `cost_center_label` — label para display
- `cost_center_path: string[]` — array de IDs seleccionados en cada nivel jerárquico
- `cost_center_movement_type_key` — tipo de movimiento del CC
- `cost_center_movement_type_label`

**Nuevos imports:**
- `useCompanyModules` — para detectar si la compañía tiene módulo `cost_centers`
- `costCentersService` + `CostCenterTreeNode` — para cargar árbol de CCs y tipos de movimiento

**Carga de datos (useEffect):**
- `costCentersService.getTree()` — carga árbol completo, construye `ccFlatMap` (Map<id, node>) para lookup
- `costCentersService.getMovementTypes()` — tipos de movimiento para SearchableSelect

**Selección jerárquica de CC:**
- El primer select muestra centros raíz (sin padre)
- Al seleccionar uno que tiene hijos, aparece otro select con los sub-centros
- Así sucesivamente hasta llegar a un nodo hoja o detenerse en cualquier nivel
- `cost_center_id` siempre apunta al último CC seleccionado en la cadena
- Al cambiar un nivel superior, se limpian los niveles inferiores

**Validación:**
- Si `hasCCModule`, cada línea requiere CC y tipo de movimiento
- Errores se muestran en el indicador de errores existente

**Payload:**
- `cost_center_id` y `cost_center_movement_type_key` se envían en cada item del payload solo si `hasCCModule`

## UI

Sub-fila debajo de cada línea del grid:
```
CC: [Centro raíz ▾] [Sub-centro ▾] [Sub-sub... ▾]  [Tipo movimiento ▾]
```
- Fondo sutil (`bg-slate-50/80`) para distinguir visualmente de la fila principal
- Selects compactos (`h-7 text-xs`)
- Solo visible si la compañía tiene módulo `cost_centers`

### `modules/cost-centers/types/index.ts`

`MovementType` ahora incluye `nature: 'DEBIT' | 'CREDIT'` — indica la naturaleza contable del tipo.
El backend usa este campo para determinar el sign del movimiento de CC (no se usa en frontend actualmente).
