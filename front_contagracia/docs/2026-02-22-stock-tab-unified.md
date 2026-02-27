# StockByStorageTab: Tab Stock Unificado

**Fecha:** 2026-02-22

## Resumen

Reemplazo del placeholder "Próximamente..." con un tab funcional que muestra stock del producto padre y sus combinaciones, con desglose por bodega si la empresa tiene el módulo `inventory_management`.

## Componente: StockByStorageTab.tsx

### Funcionalidad

- **Tabla unificada**: muestra el producto padre (badge "Principal") y todas sus combinaciones
- **Columnas**: Nombre, Barcode, Descripción, Atributos (badges), Stock Total
- **Filas expandibles**: si hay `inventory_management`, click en una fila muestra desglose por bodega con icono Warehouse + nombre almacén / bodega
- **Búsqueda fuzzy relacional**: busca por nombre, barcode, descripción y opciones de atributo
- **Paginación**: 10 items por página con controles prev/next
- **Responsive**: tabla con overflow-x-auto

### Condiciones de visibilidad

- Tab visible si `hasModule('inventory_management')` y producto no es servicio (ya estaba así en ProductDetail)
- La columna expandible y los storages solo aparecen si `has_inventory_management` es true en la respuesta

### API

Usa `productsService.getStockSummary(productId, { search, page, limit })` → `GET /products/:id/stock-summary`

### Tipos nuevos (types/index.ts)

- `StockStorageItem`: { storage_id, storage_name, storage_consecutive, warehouse_name, stock }
- `StockSummaryItem`: { id, name, barcode, description, stock, is_parent, attributes, storages? }
- `StockSummaryResponse`: { has_inventory_management, items, total, page, limit, totalPages }
