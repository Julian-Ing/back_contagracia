# Tab Combinaciones — Detalle de Producto

**Fecha:** 2026-02-22

## Descripcion
Se implementó el tab de Combinaciones en la vista de detalle de producto. Incluye tabla paginada con búsqueda fuzzy desde backend y dialog para crear combinaciones individuales.

## Cambios Backend
- `products.controller.ts`: Agregado query param `parent_product_id` a `GET /products`
- `products.service.ts`:
  - `ProductsQueryParams`: nuevo campo `parent_product_id`
  - `findAllFlat`: aplica filtro `parent_product_id` al WHERE
  - `fuzzySearchIds`: cuando recibe `parentProductId`, busca tambien en nombres de opciones de atributo (JOIN con `product_combination_attributes` y `product_attribute_options`)

## Cambios Frontend
- `types/index.ts`: Nuevos tipos `CombinationListItem`, `CombinationsResponse`, `CreateCombinationItem`, `CreateCombinationsData`
- `products.service.ts`: Nuevos metodos `getCombinations(productId, params)` y `createCombinations(productId, data)`
- `CombinationsTab.tsx`: Componente completo con:
  - Tabla paginada (10 items por pagina)
  - Busqueda fuzzy con debounce (nombre, barcode, descripcion, opciones de atributo)
  - Badges de atributos por combinacion
  - Link al detalle de cada combinacion (nombre clickeable + icono Eye)
  - Estado vacio con call-to-action
  - Dialog para crear combinacion individual:
    - Nombre y barcode
    - Precio y costo (NumericInput)
    - Seleccion de opciones por atributo (SearchableSelect)
    - Validaciones frontend + backend

## Uso del endpoint
```
GET /products?view_mode=combinations&parent_product_id={id}&search=...&page=1&limit=10
POST /products/{id}/combinations  { combinations: [{ name, barcode, price, cost, attribute_option_ids }] }
```

## Componentes reutilizados
- `SearchableSelect` — seleccion de opciones de atributo con fuzzy search local
- `NumericInput` — campos de precio/costo con formato es-CO
- `FormattedNumber` — display de precios en la tabla
