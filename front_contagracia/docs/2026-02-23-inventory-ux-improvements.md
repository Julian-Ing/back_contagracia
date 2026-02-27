# Mejoras UX Inventario

**Fecha:** 2026-02-23

## Detalle de combinaciones en modal

ProductDetail ahora funciona en dos modos:
- **Modo página** (ruta `/dashboard/inventory/:id`) — con botón "Volver" y navegación por router
- **Modo dialog** (prop `onClose`) — sin botón "Volver", cierra el dialog al cerrar

### ProductDetailDialog
Componente wrapper que renderiza `ProductDetail` dentro de un `Dialog max-w-5xl` con scroll.
Usa `usePermissions()` para pasar automáticamente todos los flags de permisos.

### CombinationsTab
- Click en nombre de combinación o icono de ojo abre `ProductDetailDialog` en modal
- Ya no navega a otra ruta, permite ver el detalle sin salir del producto padre

## BulkCombinationGenerator — Herencia de datos del padre

Las combinaciones generadas en bulk ahora heredan del producto padre:
- **Nombre:** usa `parentProduct.name` (antes concatenaba "Padre - Opcion1 / Opcion2")
- **Precio:** usa `parentProduct.price` (antes enviaba 0)
- **Costo:** usa `parentProduct.cost` (antes enviaba 0)

Prop cambiado: `parentName: string` -> `parentProduct: any`

## BulkCombinationGenerator — Rediseno UX

- Pasos visuales (1. Seleccionar opciones, 2. Revisar y confirmar)
- Descripciones claras sin jerga tecnica ("producto cartesiano" eliminado)
- Estado vacio con instrucciones: "Haz clic en las opciones de arriba para comenzar..."
- Boton "Previsualizar combinaciones (N opciones seleccionadas)"
- Cuando todas existen: mensaje verde con check en lugar de estado confuso
- Filas clickeables con highlight naranja y switch
- Footer muestra conteo de seleccionadas, boton deshabilitado dice "Crear combinaciones"

## Transferencias — Eliminacion campo `notes`

- `notes` eliminado del modelo `ProductTransfer` (Prisma schema)
- `reason` ahora es obligatorio (`@IsNotEmpty()` en DTO, `String` no nullable en schema)
- Frontend: campo de notas eliminado del formulario, razon requerida para poder enviar

## Transferencias — Layout horizontal

Dialog de crear transferencia cambiado a layout horizontal:
- Izquierda: Salidas (OUT) con fondo rojo claro
- Derecha: Entradas (IN) con fondo verde claro
- Dialog expandido a `max-w-5xl`

## Transferencias — SearchableSelect para filtro de estado

`ProductTransfersTab` reemplazado `<select>` nativo por `SearchableSelect` con opciones predefinidas.

## NumericInput en transferencias

Campos de cantidad en `CreateProductTransferDialog` reemplazados:
- `<Input type="number">` -> `<NumericInput allowNegative={false}>`
- Decimales controlados automaticamente por la configuracion de la empresa (`displayDecimals`)

## FormattedNumber en displays de stock y margen

### ProductInfoTab
- Stock: `{product.stock ?? 0}` -> `<FormattedNumber value={product.stock ?? 0} />`
- Margen: `.toFixed(1)%` -> `<FormattedNumber type="percent" />`

### ProductsList
- Stock en fila de producto: `{product.stock ?? 0}` -> `<FormattedNumber value={product.stock ?? 0} />`
- Stock en fila de combinacion expandida: `{combo.stock ?? 0}` -> `<FormattedNumber value={combo.stock ?? 0} />`

### CombinationsTab
- Stock en tabla: `{c.stock ?? 0}` -> `<FormattedNumber value={c.stock ?? 0} />`

## Boton Editar en header de ProductDetail

- Boton "Editar" agregado junto a "Eliminar" en el header
- Abre `ProductForm` en modo edicion con los datos del producto
- Si el producto es combinacion (`mode === 'COMBINATION'`), pasa `parentProductId` al form para activar modo combinacion (oculta campos heredados, muestra selectores de atributo)
- Condicionado a `canEdit && isActive`
- Al guardar recarga el detalle con `fetchProduct()`

## ProductForm — Precarga de datos al crear combinacion

Al crear una combinacion individual:
- **Nombre:** se conserva el nombre del padre (antes se limpiaba)
- **Barcode:** se autogenera uno aleatorio (antes quedaba vacio)
- Precio, costo, impuesto, categoria, unidad siguen heredandose del padre

## Archivos modificados

### Frontend
- `components/BulkCombinationGenerator.tsx` — rediseno UX + herencia datos padre
- `components/CombinationsTab.tsx` — modal detalle + FormattedNumber stock
- `components/ProductDetail.tsx` — modo dialog con `onClose`
- `components/ProductDetailDialog.tsx` — nuevo wrapper
- `components/ProductInfoTab.tsx` — FormattedNumber stock + margen
- `components/ProductsList.tsx` — FormattedNumber stock
- `components/ProductTransfersTab.tsx` — SearchableSelect estado + sin notes
- `components/CreateProductTransferDialog.tsx` — NumericInput + layout horizontal + sin notes

### Backend
- `product-transfers/dto/create-product-transfer.dto.ts` — reason obligatorio, notes eliminado
- `product-transfers/product-transfers.service.ts` — sin notes
- `contagracia-shared-modules/prisma/schema-tenant.prisma` — reason String, notes eliminado
