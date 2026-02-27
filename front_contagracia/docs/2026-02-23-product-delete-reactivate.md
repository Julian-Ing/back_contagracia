# Eliminar / Desactivar / Reactivar productos

**Fecha:** 2026-02-23

## Lógica de eliminación

### Hard delete (permanente)
Condiciones: producto NO tiene movimientos, NO tiene combinaciones, NO tiene stock en bodegas.
- Elimina el producto y todas sus relaciones (combination_attributes, attribute_assignments, storage_stocks) de la base de datos.
- El usuario es redirigido al listado.
- Modal: "Se eliminará permanentemente de la base de datos. Esta acción no se puede deshacer."

### Soft delete (desactivar)
Condiciones: tiene movimientos, combinaciones o stock en bodegas (cualquiera).
- Marca `is_active = false` en el producto y sus combinaciones hijas.
- El usuario permanece en el detalle y ve el banner de "desactivado".
- Modal: lista las razones (movimientos, combinaciones, stock) y explica que se desactivará pero se puede reactivar.

## Reactivación

- Endpoint: `PATCH /products/:id/reactivate`
- Reactiva el producto y todas sus combinaciones hijas.
- Botón "Reactivar" visible en el banner de inactivo, condicionado a permiso `canEdit`.

## Frontend — ProductDetail

### Banner inactivo
- Fondo rojo claro con icono AlertTriangle
- Texto: "Producto desactivado — No aparece en listados ni puede ser usado en operaciones"
- Botón "Reactivar" a la derecha (si `canEdit`)

### Bloqueo de acciones cuando inactivo
- Botón eliminar: oculto
- CombinationsTab: `canManageAttributes`, `canCreate`, `canEdit`, `canDelete` se pasan como `false` si `!isActive`
- `canViewCombinations` NO se bloquea (se puede ver pero no modificar)

### Badges de estado
- "Variable" renombrado a "Combinable"
- Nuevo badge "Combinación" para productos hijos
- Badge "Inactivo" en rojo cuando `!is_active`

### Icono de producto
- Gris cuando inactivo, naranja/azul cuando activo

## Backend — findOne

Ahora retorna campos adicionales:
- `has_movements: boolean` — si tiene movimientos registrados
- `has_stock: boolean` — si tiene stock > 0 en alguna bodega
- `has_combinations: boolean` — si tiene combinaciones activas (solo para modo PRODUCT)
- Ya NO lanza 404 para productos inactivos (permite ver el detalle)
