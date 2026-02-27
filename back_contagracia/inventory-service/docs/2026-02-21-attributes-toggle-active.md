# Atributos — Toggle Activo/Inactivo

**Fecha:** 2026-02-21

## Descripción
Se agregaron endpoints para activar/desactivar atributos y opciones de atributo. El `findAll` ahora retorna todos los registros (activos e inactivos) con el campo `is_active`.

## Endpoints nuevos
- `PATCH /attributes/:id/toggle-active` — alterna el estado activo del atributo. Si se desactiva, desactiva todas sus opciones también.
- `PATCH /attributes/options/:optionId/toggle-active` — alterna el estado activo de una opción individual.

## Cambios en findAll
- Removido el filtro `is_active: true` del where clause y del include de opciones
- Ahora retorna TODOS los atributos y opciones (activos e inactivos)
- Se incluye `is_active` en el response mapping de atributos

## Archivos modificados
- `src/modules/attributes/attributes.controller.ts` — nuevos endpoints toggle
- `src/modules/attributes/attributes.service.ts` — métodos toggleActive, toggleOptionActive, findAll sin filtro
