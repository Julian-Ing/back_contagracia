# Hoja de Ruta — Página de Favoritos (Blog Bookmarks)

## Resumen

Completar el sistema de bookmarks del blog creando el endpoint para listar posts guardados y la página pública `/favoritos`. El 95% del sistema ya existe (modelo Prisma, toggle endpoint, servicio frontend, botón en Header).

---

## Estado General

| # | Paso | Estado |
|---|------|--------|
| 1 | Backend: endpoint listar bookmarks | ✅ Completado |
| 2 | Frontend: método de servicio | ✅ Completado |
| 3 | Frontend: página /favoritos + layout | ✅ Completado |

---

## Lo que ya existe

- [x] Modelo `BlogBookmark` en Prisma (post_id + visitor_id, unique constraint)
- [x] Endpoint `POST /blog/posts/:slug/bookmark` para toggle
- [x] Método `blogService.toggleBookmark(slug, visitorId)` en frontend
- [x] Botón "Favoritos" en Header (`Header.tsx`) apuntando a `/favoritos`
- [x] `visitor_id` almacenado en localStorage como `blog_visitor_id`

---

## Paso 1 — Backend: endpoint para listar bookmarks

### Archivos a modificar

**`admin-service/src/modules/blog/blog-public.service.ts`**
- Agregar método `getVisitorBookmarks(visitorId: string)`
- Busca todos los `BlogBookmark` del visitor_id
- Include: post (title, slug, excerpt, featured_image, published_at, post_tags → tag, analytics)
- Filtra solo posts activos (`is_active: true`) y publicados (`published_at: not null`)
- Ordena por bookmark `created_at` desc (más recientes primero)
- Calcula reading_time igual que `findPublishedPosts()`

**`admin-service/src/modules/blog/blog-public.controller.ts`**
- Agregar `GET /blog/bookmarks?visitor_id=xxx`
- Ya tiene `@Public()` a nivel de controller, no necesita auth adicional

### Criterios de aceptación
- [x] `GET /blog/bookmarks?visitor_id=abc123` retorna array de posts con datos completos
- [x] Solo retorna posts activos y publicados
- [x] Ordenados por fecha de bookmark descendente
- [x] Si visitor_id no tiene bookmarks, retorna array vacío

---

## Paso 2 — Frontend: método de servicio

### Archivo a modificar

**`front_contagracia/src/modules/admin/services/blog.service.ts`**
- Agregar `getBookmarkedPosts(visitorId: string)` → `GET /blog/bookmarks?visitor_id=xxx`
- Usa `adminClient` (mismo que los demás métodos del blog)
- Retorna array de posts bookmarkeados

### Criterios de aceptación
- [x] Método disponible en `blogService.getBookmarkedPosts()`
- [x] Funciona sin autenticación (endpoint público)

---

## Paso 3 — Frontend: página /favoritos

### Archivos a crear

**`front_contagracia/src/app/favoritos/layout.tsx`**
- Reutiliza el mismo layout del blog (Header de landing + Footer)

**`front_contagracia/src/app/favoritos/page.tsx`**
- Lee `visitor_id` de localStorage (`blog_visitor_id`)
- Llama `blogService.getBookmarkedPosts(visitorId)` al montar
- Grid responsive: 1 col (mobile) / 2 col (md) / 3 col (lg)
- Cada card muestra:
  - Imagen destacada (o placeholder)
  - Título del post (link a `/blog/[slug]`)
  - Excerpt truncado
  - Fecha de publicación + reading time
  - Tags con Badge
  - Botón "Quitar de favoritos" (llama `toggleBookmark` + remove de lista local)
- Estado vacío: icono, mensaje "No tienes posts guardados", botón CTA a `/blog`
- Loading state con spinner
- Reutiliza componentes UI: Card, Badge, Button de `shared/components/ui/`

### Criterios de aceptación
- [x] Página accesible en `/favoritos`
- [x] Muestra posts guardados correctamente
- [x] Botón quitar elimina el post de la vista sin recargar
- [x] Estado vacío muestra CTA hacia el blog
- [x] Responsive en mobile/tablet/desktop
- [x] Dark mode funciona correctamente
- [x] Header de landing visible con botón Favoritos activo
