# Atributos — UI Activo/Inactivo

**Fecha:** 2026-02-21

## Descripción
Se actualizó la lista de atributos para mostrar el estado activo/inactivo y permitir activar/desactivar atributos y opciones.

## Cambios UI
- Columna **Estado** con badge verde (Activo) / gris (Inactivo)
- Botón toggle (icono Power) para activar/desactivar — verde cuando activo, gris cuando inactivo
- Filas inactivas se muestran con `opacity-50` (dimmed)
- Botones de editar/eliminar/agregar opción solo visibles en items activos
- El toggle de atributo desactiva en cascada todas las opciones

## Servicios frontend
- `attributesService.toggleActive(id)` — `PATCH /attributes/:id/toggle-active`
- `attributesService.toggleOptionActive(optionId)` — `PATCH /attributes/options/:optionId/toggle-active`

## Tipos
- `AttributeListItem.is_active: boolean` (ya existía en `AttributeOptionItem`)

## Archivos modificados
- `src/modules/inventory/components/AttributesList.tsx`
- `src/modules/inventory/services/attributes.service.ts`
- `src/modules/inventory/types/index.ts`
