# Imágenes de productos y combinaciones

**Fecha:** 2026-02-24

## Resumen

Se habilitó el campo `image_path` (ya existente en el schema Prisma) para productos y combinaciones. Se integra con media-service usando la misma arquitectura de logo/certificado.

## Cambios

### 1. media-service: categoría `product_image`

**Archivo:** `media-service/src/modules/media/category-config.ts`

- Nueva categoría `product_image`: 5MB, JPEG/PNG/WebP, visibility `company`, uploadPermission `inventory.items.upload_image`, viewPermission `null`

### 2. inventory-service: DTOs

**Archivos:**
- `inventory-service/src/modules/products/dto/create-product.dto.ts` — `image_path?: string | null`
- `inventory-service/src/modules/products/dto/update-product.dto.ts` — `image_path?: string | null`
- `inventory-service/src/modules/products/dto/create-combinations.dto.ts` — `image_path?: string | null` en `CombinationItemDto`

### 3. inventory-service: Service

**Archivo:** `inventory-service/src/modules/products/products.service.ts`

- `mapProductItem()` — incluye `image_path`
- `mapCombinationItem()` — incluye `image_path`
- `create()` — guarda `image_path` en data
- `update()` — actualiza `image_path` si viene en DTO
- `createCombinations()` — guarda `image_path` por combinación
- `getStockSummary()` — select incluye `image_path`, response lo mapea

## Flujo

```
1. Frontend sube imagen a media-service con category=product_image
2. Recibe { url: "/api/media/{uuid}" }
3. Frontend envía image_path en create/update de producto o combinación
4. Backend guarda en campo Product.image_path
5. Frontend carga imagen con useAuthImage (JWT) para previews y thumbnails
```

## Permisos

- Upload: `inventory.items.upload_image` (ya existe en seeder)
- View: sin restricción extra (visibility `company` aplica)
