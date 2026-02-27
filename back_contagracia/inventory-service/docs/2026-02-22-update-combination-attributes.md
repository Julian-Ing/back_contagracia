# Update: attribute_option_ids en PATCH /products/:id

**Fecha:** 2026-02-22

## Cambios

### UpdateProductDto

Campo nuevo: `attribute_option_ids?: string[]` (array de UUIDs, opcional)

### products.service.ts — update()

Cuando `attribute_option_ids` está presente en el DTO:

1. Valida que el producto sea `COMBINATION` (no se permite en productos padre)
2. Valida que todas las opciones existan y estén activas
3. Valida que no haya 2 opciones del mismo atributo
4. Verifica fingerprint contra combinaciones hermanas para evitar duplicados
5. En transacción:
   - Actualiza campos básicos del producto (si hay)
   - Borra todos los `productCombinationAttribute` existentes
   - Crea los nuevos con los IDs proporcionados
   - Retorna producto con relaciones completas

Si `attribute_option_ids` NO está presente, el update funciona igual que antes (solo campos básicos).

## Validaciones

- Solo combinaciones (`mode === 'COMBINATION'`)
- Opciones activas y existentes
- No duplicar atributo (máximo 1 opción por atributo)
- No duplicar fingerprint con combinaciones hermanas del mismo padre

## Nuevo permiso (seeder)

- `inventory.combinations.manage_attributes` — "Gestionar Atributos de Producto"
- Controla quién puede asignar/quitar atributos a un producto para combinaciones
- Total inventario: 31 permisos. Total acciones del sistema: 654.
