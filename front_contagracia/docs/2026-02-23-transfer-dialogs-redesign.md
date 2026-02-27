# Rediseño: Diálogos de transferencia (bodegas y productos)

**Fecha:** 2026-02-23

## Resumen

Rediseño completo de ambos diálogos de creación de transferencias:
- **Storage transfers**: cambiado de listas separadas OUT/IN a **pares** (misma línea = mismo producto/cantidad, solo cambia origen/destino)
- **Product transfers**: agregado selector de almacén → bodega (cascade) consistente con storage transfers
- Ambos: validación UX mejorada con `attempted` state y mensajes de error claros

---

## Storage Transfers — `CreateStorageTransferDialog`

### Antes
- Dos listas independientes: Salidas (izquierda) y Entradas (derecha)
- El usuario podía mezclar productos diferentes entre OUT e IN
- No había relación forzada entre las líneas

### Ahora — Modelo de pares
Cada línea es un par `TransferPair`:
- **Producto** (compartido) + **Cantidad** (compartida)
- **Sale de**: Almacén → Bodega (origen)
- **Entra a**: Almacén → Bodega (destino)

```
[Producto ▼] [Cant. (máx X)]  [🗑]
  Sale de: [Almacén ▼][Bodega ▼]  →  Entra a: [Almacén ▼][Bodega ▼]
```

### Beneficios
- Imposible que no coincidan cantidades OUT/IN (es la misma)
- Imposible mezclar productos (es el mismo)
- Agregar/eliminar mueve el par completo
- UX más clara: origen → destino en la misma línea

### Validaciones
- Bodega origen y destino no pueden ser la misma (error inline)
- Stock máximo compartido entre pares del mismo producto + misma bodega de salida
- Overflow: error inline si excede stock
- `attempted` state: errores solo se muestran al intentar enviar

---

## Product Transfers — `CreateProductTransferDialog`

### Cambios
- Agregado **selector de almacén** antes de bodega (cascade Almacén → Bodega)
- Cada línea OUT: Producto → Almacén → Bodega → Cantidad (grid-cols-3)
- Cada línea IN: Producto → Almacén → Bodega → Cantidad (grid-cols-3)
- Almacenes OUT: filtrados a donde el producto tiene stock
- Almacenes IN: todos los activos
- Bodegas filtradas por almacén seleccionado
- Cascade resets: producto → limpia almacén/bodega/cantidad; almacén → limpia bodega/cantidad
- Sin `inventory_management`: solo se muestra producto + cantidad (sin almacén/bodega)

### Validación UX (ambos diálogos)
- Razón marcada con `*` (requerida)
- Botón "Solicitar Transferencia" siempre habilitado
- Al hacer clic sin datos completos → `attempted = true` → mensajes de error:
  - "La razón es requerida" (+ borde rojo en input)
  - "Completa al menos una línea..."
  - "Una o más líneas exceden el stock disponible"
- Desbalance de cantidades (product transfers): ámbar antes de intentar, rojo después

---

## Archivos modificados

### Frontend
- `src/modules/inventory/components/CreateStorageTransferDialog.tsx` — reescrito con modelo de pares
- `src/modules/inventory/components/CreateProductTransferDialog.tsx` — agregado cascade almacén→bodega + validación UX
