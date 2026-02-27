# Detalle de Producto — Página y Tab Info

**Fecha:** 2026-02-21

## Descripcion
Se creo la pagina de detalle de producto con ruta protegida y el tab de informacion general.

## Ruta
- `/dashboard/inventory/[id]` — protegida con permiso `inventory.items.view_detail`

## Componentes
- `src/app/dashboard/inventory/[id]/page.tsx` — pagina con ProtectedRoute
- `src/modules/inventory/components/ProductDetail.tsx` — componente de detalle con tabs

## Tabs
- **Informacion** — siempre visible, muestra datos del producto
- **Stock por Bodega** — solo si empresa tiene modulo `inventory_management` y no es servicio
- **Kardex** — solo si no es servicio
- **Combinaciones** — solo si `mode === 'PRODUCT'` (producto padre)

## Condiciones de modulo
- Contabilidad (`accounting`): muestra card de cuentas contables. Para servicios solo cuenta de ingresos.
- Inventario (`inventory_management`): muestra tab Stock por Bodega

## Acceso desde lista
- Nombre del producto es clickeable (link naranja con hover)
- Boton Eye en columna de acciones (siempre visible, no depende de canEdit)
- Ambos navegan a `/dashboard/inventory/{id}`

## Mejoras al tab Info (v2)
- Layout compacto: una sola Card con grid 4 columnas en vez de 4 Cards separadas
- Secciones con headers inline (GENERAL, CLASIFICACION, PRECIOS, CONTABILIDAD)
- Metodo de costeo traducido: `AVERAGE` -> "Promedio ponderado", `LAST_PURCHASE` -> "Ultima compra"
- Unidad de medida: no muestra parentesis vacios si no hay simbolo
- Cuentas contables: col-span-full para nombres largos
- "IVA incluido" -> "Impuesto incluido"
- Sin tab Transferencias (no aplica en detalle producto)

## Archivos modificados
- `src/modules/inventory/components/ProductsList.tsx` — agregado boton Eye + nombre clickeable
- `src/modules/inventory/components/ProductDetail.tsx` (nuevo)
- `src/app/dashboard/inventory/[id]/page.tsx` (nuevo)
