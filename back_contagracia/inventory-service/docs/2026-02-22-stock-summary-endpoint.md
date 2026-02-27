# Endpoint: GET /products/:id/stock-summary

**Fecha:** 2026-02-22

## Resumen

Nuevo endpoint que retorna el resumen de stock de un producto y sus combinaciones, con desglose por bodega si la empresa tiene el módulo `inventory_management`.

## Endpoint

`GET /products/:id/stock-summary?search=&page=1&limit=10`

### Query Params

- `search` — búsqueda fuzzy por nombre, barcode, descripción, nombre de opción de atributo, nombre de atributo
- `page` — página (default 1)
- `limit` — items por página (default 10)

### Respuesta

```json
{
  "has_inventory_management": true,
  "items": [
    {
      "id": "uuid",
      "name": "Camisa Polo",
      "barcode": "CAM-001",
      "description": "Camisa de algodón",
      "stock": 45,
      "is_parent": true,
      "attributes": [],
      "storages": [
        { "storage_id": "uuid", "storage_name": "Bodega Norte", "storage_consecutive": "BOD-0001", "warehouse_name": "Almacén Central", "stock": 30 },
        { "storage_id": "uuid", "storage_name": "Bodega Sur", "storage_consecutive": "BOD-0002", "warehouse_name": "Almacén Central", "stock": 15 }
      ]
    },
    {
      "id": "uuid",
      "name": "Camisa Polo Roja M",
      "barcode": "CAM-001-RM",
      "description": null,
      "stock": 20,
      "is_parent": false,
      "attributes": [{ "attribute": "Color", "option": "Rojo" }, { "attribute": "Talla", "option": "M" }],
      "storages": [...]
    }
  ],
  "total": 7,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Comportamiento

- Si el producto es `PRODUCT` (padre): retorna el padre + todas sus combinaciones activas
- Si el producto es `COMBINATION`: retorna solo esa combinación
- `storages` solo se incluye si `has_inventory_management` es true
- Solo muestra bodegas con stock ≠ 0
- El padre siempre aparece primero (ordenado por parent_product_id ASC, name ASC)

### Búsqueda relacional

La búsqueda filtra por:
- `name` (contains, insensitive)
- `barcode` (contains, insensitive)
- `description` (contains, insensitive)
- `combination_attributes.attribute_option.name` (opción de atributo)
- `combination_attributes.attribute_option.attribute.name` (nombre del atributo)
