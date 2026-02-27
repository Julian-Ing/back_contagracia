# Filtro parent_product_id en GET /products

**Fecha:** 2026-02-22

## Descripcion
Se agrego el query param `parent_product_id` a `GET /products` para filtrar combinaciones por producto padre. Tambien se extendio el fuzzy search para buscar en nombres de opciones de atributo cuando se filtra por padre.

## Archivos modificados
- `src/modules/products/products.controller.ts` — nuevo `@Query('parent_product_id')`
- `src/modules/products/products.service.ts`:
  - `ProductsQueryParams` — nuevo campo `parent_product_id?: string`
  - `findAllFlat` — aplica `where.parent_product_id` si se recibe
  - `fuzzySearchIds` — acepta `parentProductId` opcional, cuando se pasa hace JOIN con `product_combination_attributes` y `product_attribute_options` para buscar por nombre de opcion

## Uso
```
GET /products?view_mode=combinations&parent_product_id=uuid&search=rojo&page=1&limit=10
```

Devuelve combinaciones del producto padre que coincidan con "rojo" en nombre, barcode, descripcion o nombre de opcion de atributo.
