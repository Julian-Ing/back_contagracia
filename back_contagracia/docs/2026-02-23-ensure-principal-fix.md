# Fix: ensurePrincipal sync stock por diferencia

**Fecha:** 2026-02-23

## Resumen

Corregido `ensurePrincipal()` en warehouses.service.ts para sincronizar stock correctamente calculando la diferencia entre `Product.stock` y `SUM(StorageStock)`, en lugar de copiar el stock completo del producto (lo cual duplicaba inventario si ya existían StorageStock en otras bodegas).

---

## Problema anterior

1. **Si el principal ya existía** → retornaba sin sincronizar stock (no reconciliaba diferencias)
2. **Al crear por primera vez** → copiaba `Product.stock` completo a la bodega principal, sin verificar si ya existía stock distribuido en otras bodegas → **duplicaba inventario**

### Ejemplo del bug

| Product.stock | StorageStock existente | Acción anterior | Resultado |
|---|---|---|---|
| 10 | Bodega A: 4, Bodega B: 6 | Crea Principal: 10 | SUM = 20 (duplicado) |

---

## Corrección

### Flujo nuevo de `ensurePrincipal()`

1. Busca almacén + bodega principal existentes
2. Si existen → los reutiliza (no crea nuevos)
3. Si no existen → crea almacén + bodega + asigna usuarios (evitando duplicados)
4. **Siempre sincroniza stock** (tanto si creó como si ya existían):
   - Obtiene productos no-servicio con `stock > 0`
   - `groupBy` en StorageStock para calcular `SUM(stock)` por producto
   - `diferencia = Product.stock - SUM(StorageStock)`
   - `diff > 0` → crea o incrementa StorageStock en la principal
   - `diff == 0` → no toca nada
   - `diff < 0` → reduce principal si tiene stock, sin bajar de 0
   - StorageStock en principal queda en 0 → lo elimina

### Ejemplo corregido

| Product.stock | SUM(StorageStock) | Diferencia | Acción en Principal |
|---|---|---|---|
| 10 | 0 (sin bodegas) | +10 | Crea StorageStock = 10 |
| 10 | 4+6=10 | 0 | Nada |
| 10 | 3+2=5 | +5 | Crea/incrementa = 5 |
| 10 | 12 (inconsistencia) | -2 | Reduce si tiene, no baja de 0 |

---

## Archivos modificados

### Backend
- `inventory-service/src/modules/warehouses/warehouses.service.ts` — reescrito `ensurePrincipal()`
