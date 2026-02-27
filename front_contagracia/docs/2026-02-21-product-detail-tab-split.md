# Separación de Tabs en Componentes Independientes

**Fecha:** 2026-02-21

## Descripcion
Se separó cada tab de la vista de detalle de producto en su propio componente. ProductDetail.tsx queda como orquestador ligero que solo monta tabs.

## Motivacion
El sistema viejo (`InventoryItemDetail.jsx`) tenía 5,661 líneas en un solo archivo con todo mezclado. La separación por tabs permite desarrollar cada funcionalidad de forma independiente sin tocar el orquestador.

## Archivos creados
- `src/modules/inventory/components/ProductInfoTab.tsx` — tab de información general (120 líneas)
- `src/modules/inventory/components/StockByStorageTab.tsx` — tab stock por bodega (placeholder)
- `src/modules/inventory/components/KardexTab.tsx` — tab kardex (placeholder)
- `src/modules/inventory/components/CombinationsTab.tsx` — tab combinaciones (placeholder)

## Archivos modificados
- `src/modules/inventory/components/ProductDetail.tsx` — reducido de 271 a 146 líneas, ahora solo importa y monta los tabs

## Estructura resultante
```
ProductDetail.tsx (146 líneas) — orquestador
├── ProductInfoTab.tsx (120 líneas) — completo
├── StockByStorageTab.tsx (20 líneas) — placeholder
├── KardexTab.tsx (20 líneas) — placeholder
└── CombinationsTab.tsx (21 líneas) — placeholder
```

## Props de cada tab
- `ProductInfoTab`: `{ product, showAccounting }`
- `StockByStorageTab`: `{ productId }`
- `KardexTab`: `{ productId }`
- `CombinationsTab`: `{ productId, canEdit }`
