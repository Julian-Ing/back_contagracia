# Asociación Producto → Atributos + Permisos de Combinaciones

**Fecha:** 2026-02-22

## Cambios

### Schema (contagracia-shared-modules)

Nueva tabla `product_attribute_assignments` — junction many-to-many entre productos padre y atributos:

```prisma
model ProductAttributeAssignment {
  id                   String @id @default(uuid())
  product_id           String
  product_attribute_id String
  created_at           DateTime @default(now())

  product   Product          @relation(fields: [product_id], references: [id], onDelete: Cascade)
  attribute ProductAttribute @relation(fields: [product_attribute_id], references: [id])

  @@unique([product_id, product_attribute_id])
  @@index([product_id])
  @@index([product_attribute_id])
  @@map("product_attribute_assignments")
}
```

Relaciones agregadas a `Product.attribute_assignments` y `ProductAttribute.product_assignments`.

### Endpoints nuevos

- `GET /products/:id/attributes` — Retorna atributos asignados al producto con sus opciones activas
- `PUT /products/:id/attributes` — Reemplaza asignaciones. Body: `{ attribute_ids: string[] }`

### Permisos de combinaciones (seeder)

4 permisos nuevos en `inventory.ts` (total módulo: 30):

- `inventory.combinations.view` — Ver combinaciones
- `inventory.combinations.create` — Crear combinación
- `inventory.combinations.edit` — Editar combinación
- `inventory.combinations.delete` — Eliminar combinación

### findOne actualizado

`findOne` ahora incluye `attribute_assignments` con include de atributo y opciones activas.

## Índices

- B-tree en `product_id` y `product_attribute_id` (Prisma schema)
- Unique constraint `(product_id, product_attribute_id)` evita duplicados
- No se necesitan GIN en esta junction table (sin búsqueda por texto)
- GIN ya existentes en `product_attributes.name` y `product_attribute_options.name` cubren el fuzzy search del dialog
