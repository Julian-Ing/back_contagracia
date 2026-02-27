# Hoja de Ruta: Blog - Admin Service + Frontend

## Objetivo

Implementar la funcionalidad completa de gestión de blog, replicando las capacidades del proyecto anterior (`horizont`) adaptándolas a la nueva arquitectura NestJS + Prisma + Next.js. Incluye gestión administrativa y páginas públicas visibles para cualquier persona.

---

## Contexto

### Proyecto anterior (`horizont`)
- **Archivos admin:** `src/pages/admin/BlogManagement.jsx` (~220 líneas) + `src/pages/admin/BlogPostForm.jsx` (~336 líneas)
- **Archivos públicos:** `src/pages/BlogPage.jsx` + `src/pages/BlogPostPage.jsx`
- **Componentes blog:** `src/components/blog/` (BlogCard, CommentForm, CommentsList, CommentItem, EngagementActions, SocialShare, TagBadge, TagFilter, RSSFeed, StarRating)
- **Componentes admin:** `src/components/admin/AnalyticsStats.jsx` + `EngagementAnalytics.jsx` + `MarkdownEditor.jsx` + `ImageUpload.jsx`
- **Hooks:** `useTags.js`, `useBlogAnalytics.js`, `useEngagement.js`, `useTagAnalytics.js`, `useBlogCache.js`, `useSEO.js`
- **Stack:** React + Supabase (RPC + Storage + Realtime)
- **Rutas:** `/#/admin/blog`, `/#/admin/blog/new`, `/#/admin/blog/edit/:slug`, `/#/blog`, `/#/blog/:slug`

### Proyecto nuevo (`NuevoContagracia`)
- **Backend:** NestJS microservicio `admin-service` (puerto 3002)
- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Database:** PostgreSQL + Prisma ORM (master)
- **Editor:** TipTap (WYSIWYG moderno)
- **Rutas admin:** `/admin/blog`, `/admin/blog/new`, `/admin/blog/edit/[slug]`
- **Rutas públicas:** `/blog`, `/blog/[slug]`
- **Estado actual:** ✅ Implementación completa (backend + frontend admin + público)

### Arquitectura Backend (referencia: `back_contagracia/README.md`)
- **Monorepo pnpm** con workspaces
- **Shared modules:** `contagracia-shared-modules/` → Prisma schemas, seeds
- **Prisma:** `schema-master.prisma` genera `@prisma/client-master`
- **Patrón:** Controller + Service + DTO (con class-validator)
- **Swagger:** Documentación automática en `/api/docs`
- **DB push (dev):** `pnpm prisma:push:master` desde `contagracia-shared-modules/`

### Arquitectura Frontend (referencia: `front_contagracia/ARQUITECTURA.md`)
- **Feature-based:** Módulos en `src/modules/` con components, hooks, services, stores, types
- **Shared UI:** `src/shared/components/ui/` (Shadcn)
- **API Client:** `adminClient` de `@/shared/services/api/apiClient` (Axios)
- **Service Pattern:** `export const blogService = { ... }` con métodos async
- **Naming:** services → `*.service.ts`, types → `*.types.ts`, hooks → `use*.ts`

### Distinción Blog vs CMS
- **CMS** (`/admin/cms`): Editor visual de páginas y secciones (landing, static, legal). Usa `Page` + `SiteSection` en Prisma. Ya implementado.
- **Blog** (`/admin/blog`): Sistema especializado de contenido con posts, tags, comentarios, engagement, analytics. Tiene su propio modelo de datos separado. **NO** usa las tablas de CMS.
- **Conexión:** El CMS tiene un `section_type: 'blog_section'` para mostrar últimos posts en la landing, pero el blog tiene sus propias tablas independientes.

---

## Alcance Funcional

### Admin - Gestión de Posts (`/admin/blog`)

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar posts con estado y fecha | Supabase query | GET /admin/blog/posts | ✅ Completado |
| Crear post (título, slug, contenido, imagen, excerpt) | INSERT blog_posts | POST /admin/blog/posts | ✅ Completado |
| Editar post existente | UPDATE blog_posts | PATCH /admin/blog/posts/:id | ✅ Completado |
| Eliminar post con confirmación | DELETE blog_posts | DELETE /admin/blog/posts/:id | ✅ Completado |
| Auto-generar slug desde título | Client-side | Client-side | ✅ Completado |
| Editor Markdown con toolbar | MarkdownEditor custom | TipTap WYSIWYG | ✅ Completado |
| Upload imagen destacada | Supabase Storage | POST /admin/blog/uploads | ✅ Completado |
| Asignar tags al post | blog_post_tags INSERT | En create/update post | ✅ Completado |
| Publicar/despublicar | published_at toggle | published_at toggle | ✅ Completado |

### Admin - Gestión de Tags (`/admin/blog`)

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar tags con conteo de posts | get_all_tags() RPC | GET /admin/blog/tags | ✅ Completado |
| Crear tag (nombre, slug, color, icono) | INSERT blog_tags | POST /admin/blog/tags | ✅ Completado |
| Editar tag | UPDATE blog_tags | PATCH /admin/blog/tags/:id | ✅ Completado |
| Eliminar tag | DELETE blog_tags | DELETE /admin/blog/tags/:id | ✅ Completado |

### Admin - Moderación de Comentarios

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar comentarios por post | Supabase query | GET /admin/blog/posts/:id/comments | ✅ Completado |
| Aprobar/desaprobar comentario | UPDATE is_approved | PATCH /admin/blog/comments/:id/approve | ✅ Completado |
| Eliminar comentario | DELETE blog_comments | DELETE /admin/blog/comments/:id | ✅ Completado |

### Admin - Analytics

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Tab Analytics: total vistas, posts, rating promedio | AnalyticsStats component | GET /admin/blog/analytics/overview | ✅ Completado |
| Tab Engagement: reacciones, bookmarks, reading time | EngagementAnalytics component | GET /admin/blog/analytics/engagement | ✅ Completado |
| Top posts por engagement | get_top_engagement_posts() | GET /admin/blog/analytics/top-posts | ✅ Completado |
| Tag analytics: clicks, vistas por tag | useTagAnalytics hook | GET /admin/blog/analytics/tags | ✅ Completado |

### Público - Blog (`/blog`)

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar posts publicados con paginación | BlogPage.jsx | GET /blog/posts | ✅ Completado |
| Búsqueda de posts | Client-side filter | Server-side search | ✅ Completado |
| Filtro por tags | useTags hook | Server-side query | ✅ Completado |
| Ordenar (fecha, título) | Client-side sort | Server-side sort | ✅ Completado |
| Vista individual del post (`/blog/[slug]`) | BlogPostPage.jsx | GET /blog/posts/:slug | ✅ Completado |
| Renderizar Markdown/HTML con syntax highlight | react-markdown + GFM | react-markdown o TipTap renderer | ✅ Completado |
| Tiempo de lectura estimado | 200 words/min calc | Server-side calc | ✅ Completado |
| Imagen destacada | Supabase Storage URL | Upload URL | ✅ Completado |

### Público - Comentarios

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar comentarios con threading (replies) | CommentsList + CommentItem | GET /blog/posts/:slug/comments | ✅ Completado |
| Crear comentario (nombre, email, contenido) | CommentForm component | POST /blog/posts/:slug/comments | ✅ Completado |
| Responder a comentario (parent_id) | parent_id support | parent_id support | ✅ Completado |
| Star rating (solo comentarios raíz, 1-5) | StarRating component | rating field | ✅ Completado |

### Público - Engagement

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Like/Dislike toggle | toggle_post_reaction() RPC | POST /blog/posts/:slug/reaction | ✅ Completado |
| Bookmark toggle | toggle_post_bookmark() RPC | POST /blog/posts/:slug/bookmark | ✅ Completado |
| Tracking de vistas | blog_views INSERT | POST /blog/posts/:slug/view | ✅ Completado |
| Reading session (tiempo, scroll, completado) | update_reading_session() RPC | POST /blog/posts/:slug/reading-session | ✅ Completado |
| Stats de engagement por post | get_post_engagement_stats() | GET /blog/posts/:slug/engagement | ✅ Completado |
| Visitor ID anónimo | localStorage visitor_id | localStorage visitor_id | ✅ Completado |

### Público - Tags

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar tags con post count | get_all_tags() RPC | GET /blog/tags | ✅ Completado |
| Incrementar click de tag | increment_tag_click() RPC | POST /blog/tags/:id/click | ✅ Completado |

---

## Implementación por Fases

### Fase 1: Base de Datos (Prisma Master Schema)

**Archivo:** `contagracia-shared-modules/prisma/schema-master.prisma`

**Modelos a agregar:**

```prisma
// ============================================
// BLOG
// ============================================

model BlogPost {
  id              String    @id @default(uuid())
  title           String
  slug            String    @unique
  content         String?   @db.Text
  excerpt         String?   @db.Text
  featured_image  String?
  author_id       String?
  published_at    DateTime?
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  author           User?                @relation(fields: [author_id], references: [id], onDelete: SetNull)
  post_tags        BlogPostTag[]
  comments         BlogComment[]
  views            BlogView[]
  analytics        BlogAnalytics?
  reactions        BlogReaction[]
  bookmarks        BlogBookmark[]
  reading_sessions BlogReadingSession[]

  @@index([slug])
  @@index([published_at])
  @@index([author_id])
  @@map("blog_posts")
}

model BlogTag {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  color       String   @default("#8B5CF6")
  icon        String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  post_tags     BlogPostTag[]
  tag_analytics BlogTagAnalytics[]

  @@map("blog_tags")
}

model BlogPostTag {
  id         String   @id @default(uuid())
  post_id    String
  tag_id     String
  created_at DateTime @default(now())

  post BlogPost @relation(fields: [post_id], references: [id], onDelete: Cascade)
  tag  BlogTag  @relation(fields: [tag_id], references: [id], onDelete: Cascade)

  @@unique([post_id, tag_id])
  @@index([post_id])
  @@index([tag_id])
  @@map("blog_post_tags")
}

model BlogComment {
  id           String   @id @default(uuid())
  post_id      String
  parent_id    String?
  author_name  String
  author_email String
  content      String   @db.Text
  rating       Int?     // 1-5, solo comentarios raíz
  is_approved  Boolean  @default(true)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  post    BlogPost      @relation(fields: [post_id], references: [id], onDelete: Cascade)
  parent  BlogComment?  @relation("CommentReplies", fields: [parent_id], references: [id], onDelete: Cascade)
  replies BlogComment[] @relation("CommentReplies")

  @@index([post_id])
  @@index([parent_id])
  @@map("blog_comments")
}

model BlogView {
  id         String   @id @default(uuid())
  post_id    String
  visitor_id String
  viewed_at  DateTime @default(now())

  post BlogPost @relation(fields: [post_id], references: [id], onDelete: Cascade)

  @@index([post_id])
  @@index([visitor_id])
  @@map("blog_views")
}

model BlogAnalytics {
  id             String   @id @default(uuid())
  post_id        String   @unique
  views_count    Int      @default(0)
  unique_views   Int      @default(0)
  comments_count Int      @default(0)
  average_rating Decimal  @default(0) @db.Decimal(3, 2)
  total_ratings  Int      @default(0)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  post BlogPost @relation(fields: [post_id], references: [id], onDelete: Cascade)

  @@map("blog_analytics")
}

model BlogReaction {
  id            String   @id @default(uuid())
  post_id       String
  visitor_id    String
  reaction_type String   // "like" | "dislike"
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  post BlogPost @relation(fields: [post_id], references: [id], onDelete: Cascade)

  @@unique([post_id, visitor_id])
  @@index([post_id])
  @@map("blog_reactions")
}

model BlogBookmark {
  id         String   @id @default(uuid())
  post_id    String
  visitor_id String
  created_at DateTime @default(now())

  post BlogPost @relation(fields: [post_id], references: [id], onDelete: Cascade)

  @@unique([post_id, visitor_id])
  @@index([post_id])
  @@map("blog_bookmarks")
}

model BlogReadingSession {
  id                   String    @id @default(uuid())
  post_id              String
  visitor_id           String
  reading_time_seconds Int       @default(0)
  scroll_percentage    Decimal   @default(0) @db.Decimal(5, 2)
  completed_reading    Boolean   @default(false)
  session_start        DateTime  @default(now())
  session_end          DateTime?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt

  post BlogPost @relation(fields: [post_id], references: [id], onDelete: Cascade)

  @@index([post_id])
  @@index([visitor_id])
  @@map("blog_reading_sessions")
}

model BlogTagAnalytics {
  id         String   @id @default(uuid())
  tag_id     String
  views      Int      @default(0)
  clicks     Int      @default(0)
  date       DateTime @default(now()) @db.Date
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  tag BlogTag @relation(fields: [tag_id], references: [id], onDelete: Cascade)

  @@unique([tag_id, date])
  @@index([tag_id])
  @@index([date])
  @@map("blog_tag_analytics")
}
```

**Relación a agregar en modelo `User` existente:**
```prisma
blog_posts BlogPost[]
```

**Comandos (desde `contagracia-shared-modules/`):**
```bash
cd contagracia-shared-modules
pnpm prisma:generate
pnpm prisma:push:master
```

---

### Fase 2: Backend - Blog Module

**Ubicación:** `admin-service/src/modules/blog/`

**Estructura de archivos:**
```
blog/
├── blog.module.ts
├── blog-posts.controller.ts       # CRUD posts (admin, prefix: admin/blog)
├── blog-posts.service.ts
├── blog-tags.controller.ts        # CRUD tags (admin)
├── blog-tags.service.ts
├── blog-comments.controller.ts    # Moderación comentarios (admin)
├── blog-comments.service.ts
├── blog-analytics.controller.ts   # Analytics endpoints (admin)
├── blog-analytics.service.ts
├── blog-public.controller.ts      # Endpoints públicos (prefix: blog)
├── blog-public.service.ts
├── blog-uploads.controller.ts     # Upload de imágenes del blog
├── blog-uploads.service.ts
└── dto/
    ├── create-post.dto.ts
    ├── update-post.dto.ts
    ├── create-tag.dto.ts
    ├── update-tag.dto.ts
    ├── create-comment.dto.ts
    ├── toggle-reaction.dto.ts
    ├── update-reading-session.dto.ts
    ├── query-posts.dto.ts
    └── index.ts
```

**Patrón:** Igual que `CategoriesModule` (controller + service + dto con class-validator)

**Endpoints Admin (`/api/admin/blog/`):**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/posts` | Listar posts (paginación, search, filtro tag/status) |
| GET | `/posts/:id` | Detalle de un post con tags |
| POST | `/posts` | Crear post con tags |
| PATCH | `/posts/:id` | Actualizar post con tags |
| DELETE | `/posts/:id` | Eliminar post (cascade) |
| GET | `/tags` | Listar tags con `_count.post_tags` |
| POST | `/tags` | Crear tag (validar nombre único) |
| PATCH | `/tags/:id` | Actualizar tag |
| DELETE | `/tags/:id` | Eliminar tag (cascade) |
| GET | `/posts/:postId/comments` | Listar comentarios del post |
| PATCH | `/comments/:id/approve` | Toggle aprobar comentario |
| DELETE | `/comments/:id` | Eliminar comentario |
| GET | `/analytics/overview` | Stats generales del blog |
| GET | `/analytics/engagement` | Métricas de engagement |
| GET | `/analytics/top-posts` | Posts con más engagement |
| GET | `/analytics/tags` | Analytics por tag |
| POST | `/uploads` | Subir imagen para blog |
| DELETE | `/uploads` | Eliminar imagen |

**Endpoints Públicos (`/api/blog/`):**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/posts` | Posts publicados (paginación, search, tags, sort) |
| GET | `/posts/:slug` | Post individual por slug |
| POST | `/posts/:slug/view` | Registrar vista |
| GET | `/posts/:slug/comments` | Comentarios aprobados |
| POST | `/posts/:slug/comments` | Crear comentario |
| GET | `/posts/:slug/engagement` | Stats engagement del post |
| POST | `/posts/:slug/reaction` | Toggle like/dislike |
| POST | `/posts/:slug/bookmark` | Toggle bookmark |
| POST | `/posts/:slug/reading-session` | Update reading session |
| GET | `/tags` | Tags con post count |
| POST | `/tags/:id/click` | Registrar click de tag |

**Query GET /posts (público) — parámetros:**
- `page` (default: 1)
- `limit` (default: 6)
- `search` (busca en título y excerpt)
- `tag_ids` (filtrar por tags, array)
- `sort_by` (date_desc, date_asc, title_asc, title_desc)

**Response GET /posts:**
```json
{
  "data": [{
    "id": "uuid",
    "title": "...",
    "slug": "...",
    "excerpt": "...",
    "featured_image": "...",
    "published_at": "ISO date",
    "created_at": "ISO date",
    "reading_time": 5,
    "tags": [{ "id": "uuid", "name": "...", "slug": "...", "color": "#..." }],
    "analytics": { "views_count": 0, "comments_count": 0, "average_rating": 0 }
  }],
  "meta": { "total": 20, "page": 1, "limit": 6, "totalPages": 4 }
}
```

**Archivos a modificar:**
- `admin-service/src/app.module.ts` — importar `BlogModule`
- `admin-service/src/main.ts` — ya tiene tag 'blog' en Swagger (línea 33)

---

### Fase 3: Frontend - Types & Service Layer

**Archivo a crear:** `front_contagracia/src/modules/admin/types/blog.types.ts`

```typescript
// Blog Post
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  author_id?: string;
  published_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reading_time?: number;
  tags?: BlogTag[];
  analytics?: BlogAnalyticsData;
  _count?: { comments: number; views: number };
}

// Blog Tag
export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  _count?: { post_tags: number };
}

// Blog Comment
export interface BlogComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_name: string;
  author_email: string;
  content: string;
  rating: number | null;
  is_approved: boolean;
  created_at: string;
  replies?: BlogComment[];
}

// Analytics
export interface BlogAnalyticsData {
  views_count: number;
  unique_views: number;
  comments_count: number;
  average_rating: number;
  total_ratings: number;
}

export interface BlogOverviewStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  avgRating: number;
}

export interface EngagementStats {
  likes_count: number;
  dislikes_count: number;
  bookmarks_count: number;
  avg_reading_time_minutes: number;
  completion_rate_percentage: number;
}

export interface EngagementUserState {
  user_reaction: 'like' | 'dislike' | null;
  user_bookmarked: boolean;
}

// DTOs
export interface CreatePostDto {
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  published_at?: string | null;
  tag_ids?: string[];
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

export interface CreateTagDto {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateTagDto extends Partial<CreateTagDto> {}

export interface CreateCommentDto {
  author_name: string;
  author_email: string;
  content: string;
  parent_id?: string;
  rating?: number;
}

export interface BlogPostQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  tag_id?: string;
  status?: 'published' | 'draft' | 'all';
  sort_by?: 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';
}

export interface PaginatedBlogResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
```

**Archivo a crear:** `front_contagracia/src/modules/admin/services/blog.service.ts`

```typescript
// Admin endpoints
getPosts(params: BlogPostQueryParams): Promise<PaginatedBlogResponse<BlogPost>>
getPost(id: string): Promise<BlogPost>
createPost(data: CreatePostDto): Promise<BlogPost>
updatePost(id: string, data: UpdatePostDto): Promise<BlogPost>
deletePost(id: string): Promise<void>
getTags(): Promise<BlogTag[]>
createTag(data: CreateTagDto): Promise<BlogTag>
updateTag(id: string, data: UpdateTagDto): Promise<BlogTag>
deleteTag(id: string): Promise<void>
getComments(postId: string): Promise<BlogComment[]>
approveComment(id: string): Promise<void>
deleteComment(id: string): Promise<void>
getAnalyticsOverview(): Promise<BlogOverviewStats>
getEngagementAnalytics(): Promise<EngagementStats>
getTopPosts(limit?: number): Promise<BlogPost[]>
getTagAnalytics(): Promise<any>
uploadImage(file: File): Promise<{ url: string }>
deleteImage(url: string): Promise<void>

// Public endpoints
getPublicPosts(params): Promise<PaginatedBlogResponse<BlogPost>>
getPublicPost(slug: string): Promise<BlogPost>
registerView(slug: string, visitorId: string): Promise<void>
getPublicComments(slug: string): Promise<BlogComment[]>
createComment(slug: string, data: CreateCommentDto): Promise<BlogComment>
getEngagement(slug: string): Promise<EngagementStats>
toggleReaction(slug: string, type: string, visitorId: string): Promise<void>
toggleBookmark(slug: string, visitorId: string): Promise<void>
updateReadingSession(slug: string, data: any): Promise<void>
getPublicTags(): Promise<BlogTag[]>
trackTagClick(tagId: string): Promise<void>
```

---

### Fase 4: Frontend - Dependencia TipTap

**Instalar en `front_contagracia/`:**
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-code-block-lowlight lowlight
```

**Crear componente:** `front_contagracia/src/shared/components/editors/TipTapEditor.tsx`

Features:
- Toolbar: Bold, Italic, Strike, Headings (H1-H3), Bullet list, Ordered list, Code block, Link, Image
- Soporte para insertar imágenes (upload al endpoint del blog)
- Output en HTML (almacenado como string en `content`)
- Responsive y dark mode compatible

---

### Fase 5: Frontend - Blog Admin Pages

**Archivo a modificar:** `front_contagracia/src/app/admin/blog/page.tsx`

Cambios:
1. Reemplazar `MOCK_POSTS` → `blogService.getPosts()`
2. Reemplazar `MOCK_ANALYTICS` → `blogService.getAnalyticsOverview()`
3. Tab "Posts": tabla con datos reales, delete con confirmación y toast
4. Tab "Analytics": stats reales (total vistas, posts, publicados, borradores, avg rating)
5. Tab "Engagement": datos reales (reacciones, bookmarks, reading time, completion rate, top posts)
6. Tab "Tags Analytics": datos reales (tags con clicks, vistas, tendencias)
7. Toast notifications con `react-hot-toast`

**Archivo a modificar:** `front_contagracia/src/app/admin/blog/new/page.tsx`

Cambios:
1. Reemplazar `AVAILABLE_TAGS` mock → `blogService.getTags()`
2. Reemplazar textarea de contenido → componente `TipTapEditor`
3. Implementar `handleSubmit` → `blogService.createPost()`
4. Implementar upload de imagen → `blogService.uploadImage()`
5. Toast notifications

**Archivo a crear:** `front_contagracia/src/app/admin/blog/edit/[slug]/page.tsx`

Funcionalidad:
1. Cargar post existente por slug → `blogService.getPost(id)` o endpoint por slug
2. Reusar misma UI que `new/page.tsx` pero en modo edición
3. Cargar tags seleccionados del post
4. Cargar imagen existente
5. `handleSubmit` → `blogService.updatePost(id, data)`

---

### Fase 6: Frontend - Blog Public Pages

**Archivo a crear:** `front_contagracia/src/app/(public)/blog/page.tsx`

- Grid de BlogCards con posts publicados
- Búsqueda por título/excerpt
- Filtro por tags (chips seleccionables)
- Ordenar por fecha o título
- Paginación (6 posts por página)
- SEO metadata

**Archivo a crear:** `front_contagracia/src/app/(public)/blog/[slug]/page.tsx`

- Vista completa del post con imagen destacada
- Renderizado de HTML (output de TipTap)
- Tiempo de lectura estimado
- Tags del post
- Sección de comentarios (threaded)
  - Formulario para comentar (nombre, email, contenido, rating)
  - Replies hasta 3 niveles
- Engagement actions (like/dislike/bookmark)
- Tracking automático de vista y reading session
- Visitor ID anónimo en localStorage

**Componentes a crear en `front_contagracia/src/shared/components/blog/`:**
- `BlogCard.tsx` — Card del post con imagen, título, excerpt, tags, fecha
- `CommentForm.tsx` — Formulario de comentario
- `CommentsList.tsx` — Lista de comentarios con threading
- `CommentItem.tsx` — Comentario individual con replies
- `EngagementActions.tsx` — Botones like/dislike/bookmark con conteos
- `StarRating.tsx` — Selector de estrellas (1-5)
- `TagFilter.tsx` — Chips de tags para filtrar

---

## Dependencias entre Fases

```
Fase 1 (Schema) ──→ Fase 2 (Backend Blog) ──→ Fase 3 (Types + Service)
                                                      │
                                           ┌──────────┼──────────┐
                                           ▼          ▼          ▼
                                    Fase 4 (TipTap) Fase 5    Fase 6
                                           │       (Admin)   (Public)
                                           └──→ Fase 5 ──→ Fase 6
```

---

## Mapeo de Funcionalidades: Viejo → Nuevo

| Viejo (Supabase) | Nuevo (NestJS/Prisma) |
|---|---|
| `supabase.from('blog_posts').select()` | `GET /api/admin/blog/posts` |
| `supabase.from('blog_posts').insert()` | `POST /api/admin/blog/posts` |
| `supabase.from('blog_posts').update()` | `PATCH /api/admin/blog/posts/:id` |
| `supabase.from('blog_posts').delete()` | `DELETE /api/admin/blog/posts/:id` |
| `supabase.rpc('get_all_tags')` | `GET /api/admin/blog/tags` |
| `supabase.rpc('get_posts_with_tags', {...})` | `GET /api/blog/posts?tag_ids=...&search=...` |
| `supabase.from('blog_comments').select()` | `GET /api/blog/posts/:slug/comments` |
| `supabase.from('blog_comments').insert()` | `POST /api/blog/posts/:slug/comments` |
| `supabase.rpc('get_post_engagement_stats')` | `GET /api/blog/posts/:slug/engagement` |
| `supabase.rpc('toggle_post_reaction')` | `POST /api/blog/posts/:slug/reaction` |
| `supabase.rpc('toggle_post_bookmark')` | `POST /api/blog/posts/:slug/bookmark` |
| `supabase.rpc('update_reading_session')` | `POST /api/blog/posts/:slug/reading-session` |
| `supabase.rpc('get_tag_analytics')` | `GET /api/admin/blog/analytics/tags` |
| `supabase.rpc('get_popular_tags')` | `GET /api/blog/tags` |
| `supabase.rpc('increment_tag_click')` | `POST /api/blog/tags/:id/click` |
| `supabase.rpc('get_engagement_analytics')` | `GET /api/admin/blog/analytics/engagement` |
| `supabase.rpc('get_top_engagement_posts')` | `GET /api/admin/blog/analytics/top-posts` |
| `supabase.rpc('get_recent_engagement')` | Incluido en engagement analytics |
| Supabase Storage (images) | `POST /api/admin/blog/uploads` |
| `MarkdownEditor` (custom) | TipTap WYSIWYG |

---

## Modelo de Datos Completo

```
blog_posts (1) ──── (N) blog_post_tags ──── (N) blog_tags
     │                                              │
     │                                    (N) blog_tag_analytics (daily)
     │
     ├──── (N) blog_comments (self-ref parent_id → replies)
     │
     ├──── (N) blog_views (visitor tracking)
     │
     ├──── (1) blog_analytics (aggregated stats, 1:1)
     │
     ├──── (N) blog_reactions (like/dislike per visitor)
     │
     ├──── (N) blog_bookmarks (per visitor)
     │
     └──── (N) blog_reading_sessions (time + scroll + completion)

users (1) ──── (N) blog_posts (author)
```

---

## Criterios de Aceptación

- [x] Schema: 11 tablas de blog creadas en master DB
- [x] Backend: CRUD completo de posts con tags
- [x] Backend: CRUD completo de tags
- [x] Backend: Moderación de comentarios
- [x] Backend: Analytics overview, engagement, top posts, tag analytics
- [x] Backend: Endpoints públicos (posts, comments, engagement, reactions, bookmarks, reading)
- [x] Backend: Upload de imágenes propio del blog
- [x] Frontend: TipTap editor integrado en create/edit
- [x] Frontend: Lista de posts admin con datos reales
- [x] Frontend: Crear post con tags, imagen, contenido
- [x] Frontend: Editar post existente
- [x] Frontend: Eliminar post con confirmación
- [x] Frontend: Tabs de analytics con datos reales
- [x] Frontend: Página pública `/blog` con grid de posts
- [x] Frontend: Página pública `/blog/[slug]` con vista completa
- [x] Frontend: Comentarios con threading y star rating
- [x] Frontend: Engagement (like/dislike/bookmark)
- [x] Frontend: View tracking y reading session
- [x] Frontend: Toast notifications en todas las operaciones
- [x] Sin errores de TypeScript
- [x] Patrones consistentes con el resto del proyecto
