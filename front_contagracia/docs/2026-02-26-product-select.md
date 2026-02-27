# ProductSelect — Componente custom de selección de productos

**Fecha**: 2026-02-26

## Resumen

Componente `ProductSelect` custom que reemplaza el `SearchableSelect` genérico en `DocumentItemsTable`. Sigue el patrón de `ThirdPartySelect`.

## Archivo nuevo

### `shared/components/ui/product-select.tsx`
- Búsqueda server-side via `productsService.getForSelect()` con debounce 300ms
- Infinite scroll con paginación
- Badges: count de variantes (azul), servicio (morado)
- Precio formateado con `<FormattedNumber>`
- Creación inline: botón "Nuevo producto" gated por `can('products.create')`
- Modal de creación usa `<ProductForm>` (self-contained Dialog)
- Soporte portal (`usePortal` prop) para contenedores con overflow
- Focus isolation para Radix Dialog
- Keyboard navigation: ArrowUp/Down, Enter, Escape
- `onSelect(product: ForSelectProduct)` retorna data completa (incluye combinations)

## Archivo modificado

### `invoicing/components/DocumentItemsTable.tsx`
- Reemplazado `<SearchableSelect>` por `<ProductSelect>` para agregar productos
- Eliminado estado de búsqueda: `searchResults`, `loadingProducts`, `searchFetchId`, `debounceTimer`
- Eliminados callbacks/memos: `fetchProducts`, `selectOptions`, `combinationsByParent`
- Eliminado `useRef` del import (ya no se usa)
- `handleAddProduct` ahora recibe `ForSelectProduct` (antes `string`)
- `openVariantSelector` acepta `combinations?: ForSelectItem[]` opcionales (evita API call cuando vienen del select)
- `SearchableSelect` se mantiene para selector de bodega (storage)

## Props del componente

```typescript
interface ProductSelectProps {
  onSelect: (product: ForSelectProduct) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  usePortal?: boolean;
  pageSize?: number;
}
```
