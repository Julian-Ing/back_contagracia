# Atributos y Opciones — CRUD Backend

**Fecha:** 2026-02-20

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /attributes | Lista con fuzzy search (atributo + opciones), paginación, opciones anidadas |
| POST | /attributes | Crear atributo (nombre único) |
| PATCH | /attributes/:id | Actualizar atributo |
| DELETE | /attributes/:id | Soft delete (solo si ninguna opción en uso por combinaciones) |
| POST | /attributes/:id/options | Crear opción para un atributo |
| PATCH | /attributes/options/:optionId | Actualizar opción |
| DELETE | /attributes/options/:optionId | Soft delete opción (solo si no en uso por combinaciones) |

## Búsqueda inteligente

- Si la búsqueda coincide con una opción, trae al atributo padre
- Si coincide con un atributo, lo trae con todas sus opciones
- Fuzzy search con pg_trgm (word_similarity > 0.3)

## Validaciones

- Nombre de atributo único entre activos
- Nombre de opción único dentro del mismo atributo
- No se puede eliminar atributo si alguna opción está en uso por combinaciones
- No se puede eliminar opción en uso por combinaciones
- Soft delete en cascada: eliminar atributo desactiva todas sus opciones

## Archivos

- `src/modules/attributes/attributes.module.ts`
- `src/modules/attributes/attributes.controller.ts`
- `src/modules/attributes/attributes.service.ts`
- `src/modules/attributes/dto/create-attribute.dto.ts`
- `src/modules/attributes/dto/update-attribute.dto.ts`
- `src/modules/attributes/dto/create-attribute-option.dto.ts`
- `src/modules/attributes/dto/update-attribute-option.dto.ts`
- `src/modules/attributes/dto/index.ts`
- `src/app.module.ts` — Registrado AttributesModule
