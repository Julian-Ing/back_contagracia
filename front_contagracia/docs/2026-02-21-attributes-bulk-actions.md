# Atributos — Acciones Masivas (Frontend)

**Fecha:** 2026-02-21

## Descripción
Se agregaron 3 acciones masivas al módulo de atributos y opciones, accesibles desde dropdown menus.

## Funcionalidades

### 1. Crear múltiples atributos
- Dropdown "Crear" > "Múltiples atributos"
- Modal con filas dinámicas (nombre + descripción)
- Validación de duplicados en frontend antes de enviar
- **Permiso**: `inventory.attributes.create`

### 2. Agregar múltiples opciones a atributo existente
- Dropdown "+" en fila del atributo > "Múltiples opciones"
- Modal con campos dinámicos de nombre
- **Permiso**: `inventory.attribute_options.create`

### 3. Crear atributos con opciones (fusión)
- Dropdown "Crear" > "Atributos con opciones"
- Modal con cards por atributo, cada una con opciones anidadas
- **Permisos**: `inventory.attributes.create` + `inventory.attribute_options.create`

## UI
- Botón "Crear" ahora es un DropdownMenu con 3 opciones
- Botón "+" por atributo ahora es un DropdownMenu (1 opción / múltiples opciones)
- Iconos: `Plus` (individual), `ListPlus` (masivo), `Tags` (fusión)

## Validación de duplicados en tiempo real
- **Frontend**: borde rojo + texto "Nombre duplicado" al instante mientras escribe
- Botón de crear se deshabilita mientras haya duplicados
- Atributos: unicidad global (no dos atributos con el mismo nombre)
- Opciones: unicidad por atributo (dos atributos diferentes SÍ pueden tener opciones con el mismo nombre)
- **Backend**: validación adicional contra DB (nombres activos existentes)
- Scope: atributos globalmente, opciones scoped a `product_attribute_id`

## Archivos modificados
- `src/modules/inventory/components/AttributesList.tsx`
- `src/modules/inventory/services/attributes.service.ts`
