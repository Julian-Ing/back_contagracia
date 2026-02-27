# Atributos y Opciones — Frontend

**Fecha:** 2026-02-20

## Ubicación

- **Ruta:** `/dashboard/attributes-and-terms`
- **Módulo:** `src/modules/inventory/`

## Componente

### AttributesList (`components/AttributesList.tsx`)

Vista jerárquica expandible: atributos como filas padre, opciones como filas hijas.

**Características:**
- Expand/collapse por atributo (ChevronRight/ChevronDown)
- Búsqueda fuzzy (busca en atributos y opciones)
- Paginación (50 por página)
- Modales inline para crear/editar atributos y opciones
- Botón + en fila de atributo para agregar opción directamente
- Confirmación antes de eliminar
- Auto-expandir padre al crear nueva opción

**Permisos (10):**
- `inventory.attributes.view/create/edit/delete`
- `inventory.attribute_options.view/create/edit/delete`

## Archivos

### Creados
- `src/modules/inventory/components/AttributesList.tsx`
- `src/modules/inventory/services/attributes.service.ts`
- `src/app/dashboard/attributes-and-terms/page.tsx`

### Modificados
- `src/modules/inventory/types/index.ts` — Tipos Attribute*
- `src/modules/inventory/index.ts` — Exports agregados
