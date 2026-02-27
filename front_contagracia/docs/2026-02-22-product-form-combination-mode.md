# ProductForm: Modo Combinación + Permiso manage_attributes

**Fecha:** 2026-02-22

## Resumen

El formulario `ProductForm` soporta modo combinación al pasar `parentProductId`. Muestra **todos los campos idénticos** a un producto normal (toggle servicio, unidad, impuesto, categoría, costeo, cuentas contables), precargados desde el padre en creación. Se agrega una sección de opciones de atributo al final.

## Cambios

### ProductForm.tsx — Modo combinación

**Prop nueva:** `parentProductId?: string` — activa modo combinación.

**Comportamiento en creación de combinación:**
- Precarga TODOS los datos del producto padre (categoría, unidad, impuesto, cuentas, costos, etc.)
- Limpia nombre, barcode y descripción para que el usuario los complete
- Todos los campos son editables (el formulario es idéntico al de producto normal)

**Comportamiento en edición de combinación:**
- Carga datos de la combinación existente
- Preselecciona las opciones de atributo actuales de la combinación

**UI en modo combinación:**
- Título: "Nueva Combinación" / "Editar Combinación"
- Toggle "Es un servicio" oculto (las combinaciones heredan esto del padre)
- El resto de campos visibles y editables (mismo layout que producto normal)
- **Sección extra**: opciones de atributo (SearchableSelect por cada atributo asignado al padre)
- Botón "Crear" con estilo orange (consistente con el módulo)

**handleSave:**
- Crear: usa `productsService.createCombinations(parentProductId, ...)`
- Editar: usa `productsService.update(id, { ...basePayload, attribute_option_ids })`
- Mismas validaciones que producto normal + validación de opciones de atributo

### CombinationsTab.tsx — Usa ProductForm + permisos granulares

- Eliminado el dialog inline de creación (~80 líneas menos)
- Usa `<ProductForm parentProductId={productId}>` para crear/editar
- Columna "Acciones" con botón editar (lápiz) condicionado a `canEdit`
- `ProductAttributeAssigner` condicionado a `canManageAttributes` (`inventory.combinations.manage_attributes`)
- Lista de combinaciones condicionada a `canViewCombinations` (`inventory.combinations.view`)

### ProductDetail.tsx — Tab renombrado + permisos

- Tab renombrado: "Combinaciones" → **"Combinaciones y Atributos"**
- Tab visible si `canViewCombinations` **O** `canManageProductAttributes`
- Pasa `canManageAttributes` y `canViewCombinations` como props separados a CombinationsTab

### page.tsx — Nuevo permiso

- `canManageProductAttributes={can('inventory.combinations.manage_attributes')}`

### Tipos (types/index.ts)

- `UpdateProductData`: agregado campo `attribute_option_ids?: string[]`

## Nuevo permiso (seeder)

- `inventory.combinations.manage_attributes` — "Gestionar Atributos de Producto"
- Controla el componente `ProductAttributeAssigner` (asignar/quitar atributos a un producto)
- Total inventario: 31 permisos. Total acciones: 654.

## Flujo

1. Usuario abre tab "Combinaciones y Atributos" en detalle de producto
2. Si tiene `manage_attributes`: ve el assigner para gestionar qué atributos aplican
3. Si tiene `view combinations`: ve la tabla de combinaciones
4. Click "Crear combinación" → abre ProductForm completo con datos del padre precargados + sección de opciones
5. Click lápiz en tabla → abre ProductForm con datos de la combinación + opciones preseleccionadas
6. Al guardar creación → `POST /products/:parentId/combinations`
7. Al guardar edición → `PATCH /products/:id` con `attribute_option_ids`
