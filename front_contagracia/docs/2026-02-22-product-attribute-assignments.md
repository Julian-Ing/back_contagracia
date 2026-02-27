# Asociación Producto → Atributos + Permisos de Combinaciones

**Fecha:** 2026-02-22

## Cambios

### Permisos de combinaciones

`page.tsx` ahora pasa 4 permisos de combinaciones a `ProductDetail`:
- `canViewCombinations` → `inventory.combinations.view`
- `canCreateCombination` → `inventory.combinations.create`
- `canEditCombination` → `inventory.combinations.edit`
- `canDeleteCombination` → `inventory.combinations.delete`

El tab de Combinaciones está condicionado a `canViewCombinations` (además de `product.mode === 'PRODUCT'`).

### ProductAttributeAssigner (componente nuevo)

`src/modules/inventory/components/ProductAttributeAssigner.tsx`

- Card con badges de atributos asignados al producto
- Botón "Gestionar" (condicionado a `canEdit`) abre dialog
- Dialog con **fuzzy search** sobre todos los atributos activos (usa `attributesService.getAll` existente con su búsqueda fuzzy backend)
- Checkboxes para seleccionar/deseleccionar atributos
- Guarda con `PUT /products/:id/attributes`

### CombinationsTab actualizado

- Integra `ProductAttributeAssigner` arriba de la tabla
- El dialog de crear combinación ahora muestra **solo atributos asignados** (no todos)
- Si no hay atributos asignados, "Crear combinación" muestra toast de advertencia
- `canCreate` controla el botón de crear combinación
- `canEdit` controla el botón "Gestionar" atributos

### Tipos nuevos

```typescript
interface AssignedAttributeOption { id: string; name: string; }
interface AssignedAttribute { id: string; name: string; options: AssignedAttributeOption[]; }
```

### Métodos de servicio nuevos

- `productsService.getProductAttributes(productId)` → `GET /products/:id/attributes`
- `productsService.setProductAttributes(productId, attributeIds)` → `PUT /products/:id/attributes`
