# BulkCombinationGenerator: generación masiva de combinaciones

**Fecha:** 2026-02-22

## Resumen

Nuevo componente `BulkCombinationGenerator` que permite generar combinaciones masivas usando producto cartesiano de opciones de atributo. Similar al sistema anterior pero mejorado con un solo request al backend.

## Componente: BulkCombinationGenerator.tsx

### Props

- `productId: string` — ID del producto padre
- `parentName: string` — nombre del padre (para auto-generar nombres de combinaciones)
- `assignedAttributes: AssignedAttribute[]` — atributos con opciones del padre
- `open / onOpenChange` — control del dialog
- `onCreated` — callback post-creación

### Algoritmo de producto cartesiano

1. **Selección de opciones**: badges clickeables por atributo, con "Seleccionar todo / Deseleccionar todo"
2. **Generación por índice**: mismo algoritmo que el sistema viejo — convierte un índice lineal en coordenadas multi-dimensionales (base conversion)
3. **Dedup**: obtiene fingerprints existentes vía `GET /products/:id/combination-fingerprints`, filtra combinaciones que ya existen
4. **Batches de 10**: genera 10 combinaciones a la vez, con botón "Cargar más"
5. **Preview**: lista scrolleable con toggle switches por combinación, búsqueda por nombre
6. **Creación**: envía array completo en un solo `POST /products/:id/combinations` (transacción atómica)

### Nombres auto-generados

`${parentName} - ${opcion1} / ${opcion2} / ...`

### Barcodes auto-generados

Código aleatorio: `${timestamp_base36}-${random_4chars}`

### Pre-selección

Todas las combinaciones generadas se pre-seleccionan automáticamente. El usuario puede deseleccionar individualmente o con "Deseleccionar todo".

## Integración en CombinationsTab

- Nuevo botón "Generar combinaciones" (icono Wand2) al lado de "Crear combinación"
- Condicionado a permiso `canCreate`
- Requiere atributos asignados (muestra error si no hay)
- `parentName` se pasa como prop nueva desde ProductDetail

## ProductDetail.tsx

- Pasa `parentName={product.name}` a CombinationsTab
