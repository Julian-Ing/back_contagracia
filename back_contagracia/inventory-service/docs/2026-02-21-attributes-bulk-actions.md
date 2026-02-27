# Atributos — Acciones Masivas

**Fecha:** 2026-02-21

## Descripción
Endpoints para crear atributos y opciones de forma masiva. Validan unicidad de nombres tanto dentro del request como contra la DB.

## Endpoints nuevos

### POST /attributes/bulk
Crear múltiples atributos de una vez.
- **Permiso**: `inventory.attributes.create`
- **Body**: `{ attributes: [{ name, description? }] }`
- **Validación**: nombres únicos en request + no duplicados activos en DB
- **Response**: `{ message, count, data }`

### POST /attributes/:id/options/bulk
Crear múltiples opciones para un atributo existente.
- **Permiso**: `inventory.attribute_options.create`
- **Body**: `{ names: ["Rojo", "Azul", "Verde"] }`
- **Validación**: nombres únicos en request + no duplicados activos en ese atributo
- **Response**: `{ message, count, data }`

### POST /attributes/bulk-with-options
Crear múltiples atributos con sus opciones en una transacción.
- **Permisos**: `inventory.attributes.create` + `inventory.attribute_options.create`
- **Body**: `{ attributes: [{ name, description?, options: ["Rojo", "Azul"] }] }`
- **Validación**: nombres de atributos únicos + opciones únicas por atributo + no duplicados en DB
- **Response**: `{ message, attributesCount, optionsCount, data }`

## Archivos nuevos
- `src/modules/attributes/dto/bulk-create-attributes.dto.ts`
- `src/modules/attributes/dto/bulk-create-options.dto.ts`
- `src/modules/attributes/dto/bulk-create-with-options.dto.ts`

## Archivos modificados
- `src/modules/attributes/dto/index.ts`
- `src/modules/attributes/attributes.service.ts`
- `src/modules/attributes/attributes.controller.ts`
