# Endpoint GET /categories/for-select

**Fecha:** 2026-02-21

## Descripción
Endpoint ligero para poblar selects de categorías. Solo devuelve `{id, name}` sin conteo de productos.

## Query params
- `search` — buscar por nombre o consecutivo

## Archivos modificados
- `src/modules/categories/categories.controller.ts`
- `src/modules/categories/categories.service.ts`
