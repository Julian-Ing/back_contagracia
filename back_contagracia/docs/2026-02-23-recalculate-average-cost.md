# Recalculo de Costo Promedio Ponderado en Transferencias

**Fecha:** 2026-02-23

## Resumen

Al aprobar una transferencia entre productos, si el producto destino tiene `costing_type: 'AVERAGE'`, se recalcula su costo unitario usando promedio ponderado.

## Funcion `recalculateAverageCost` (shared-modules)

Funcion pura en `src/functions/recalculate-average-cost.ts`. No hace operaciones de DB, solo calcula.

### Parametros

```typescript
{
  currentStock: number;      // Stock del producto ANTES de la entrada
  currentCost: number;       // Costo unitario actual
  incomingQuantity: number;  // Cantidad que entra
  incomingCost: number;      // Costo unitario de lo que entra
}
```

### Formula

```
nuevo_costo = (stock_actual * costo_actual + cantidad_entrante * costo_entrante) / (stock_actual + cantidad_entrante)
```

Si `currentStock <= 0`, retorna `incomingCost` directamente.

### Retorna

`number` — el nuevo costo calculado.

## Uso en transferencias (`product-transfers.service.ts → approve()`)

### Flujo

1. Cargar costos de productos OUT y stock/costo/costing_type de productos IN **antes** de mover stock
2. Ejecutar `moveStock()` para cada item (actualiza stock)
3. Calcular costo promedio ponderado de todos los OUT:
   ```
   weightedOutCost = sum(cantidad_out_i * costo_out_i) / sum(cantidad_out_i)
   ```
4. Para cada item IN con `costing_type === 'AVERAGE'`:
   - Llamar `recalculateAverageCost()` con stock/costo previos y el `weightedOutCost`
   - Actualizar `product.cost` con el resultado

### Ejemplo

Transferencia: 30 unidades de Producto A ($800) + 20 unidades de Producto B ($600) → 50 unidades de Producto C

```
weightedOutCost = (30 * 800 + 20 * 600) / 50 = $720

Producto C tiene: stock=100, cost=$500, costing_type=AVERAGE
nuevo_costo = (100 * 500 + 50 * 720) / 150 = $573.33
```

### Cuando NO se recalcula

- `costing_type === 'LAST_PURCHASE'`: no se modifica el costo (una transferencia no es una compra)
- Transferencias entre bodegas (storage transfers): no cambian el costo porque es el mismo producto
- Ajustes manuales IN: por ahora no recalculan (entran al costo actual del producto)

## Archivos modificados

- `contagracia-shared-modules/src/functions/recalculate-average-cost.ts` (nuevo)
- `contagracia-shared-modules/index.ts` (export)
- `inventory-service/src/modules/product-transfers/product-transfers.service.ts` (approve)
