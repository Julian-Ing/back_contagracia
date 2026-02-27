# Hoja de Ruta - Migración del CMS

> **Origen:** `horizont/` (React + Supabase)
> **Destino:** `NuevoContagracia/` (Next.js 16 + NestJS + Prisma + PostgreSQL)
> **Arquitectura de referencia:** `front_contagracia/ARQUITECTURA.md`
> **Fecha de creación:** 2026-01-28

---

## Resumen de decisiones

| Decisión | Valor |
|---|---|
| Servicio backend | `admin-service` (puerto 3002) |
| Schema Prisma | `schema-master.prisma` (global, convención snake_case con `@@map`) |
| Rutas admin frontend | `/admin/landing` (secciones landing) y `/admin/cms` (páginas) |
| Alcance | Completo: secciones predefinidas + Page Builder visual |
| Almacenamiento de imágenes | Servidor local (carpeta general a nivel de proyecto) |
| Pricing section | Lee planes desde endpoint existente `GET /admin/plans` |
| Blog section | Consume endpoints del módulo blog (existente/por crear) |
| Preview | Inline (panel derecho en editor de secciones) + modal (botón en Page Builder) |
| Editores de texto | Inputs/textareas planos (NO hay rich text editors tipo TipTap/Quill) |

---

## Contexto: Qué se migra

### Desde `/#/admin/content` (viejo) -> `/admin/landing` (nuevo)
- Gestión de secciones de la landing principal (hero, features, benefits, pricing, blog, CTA)
- Edición de contenido por sección (título, subtítulo, contenido JSONB)
- Toggle de visibilidad y reordenamiento
- **Preview inline** a la derecha del editor de cada sección (ej: `/#/admin/content/edit/:sectionId`)

### Desde `/#/admin/cms` (viejo) -> `/admin/cms` (nuevo)
- CRUD de páginas (landing, static, blog_list, legal, custom)
- Configuración de navegación (header/footer con labels y orden)
- SEO (meta_title, meta_description, og_title, og_description, og_image)
- Page Builder visual con grid 12 columnas y drag & drop
- 15+ componentes arrastrables (heading, text, image, button, card, video, etc.)
- **Preview en modal** desde el Page Builder (botón "Vista previa")

---

## Inventario de componentes UI del viejo (a migrar)

### Componentes compartidos del editor

| Componente viejo | Ubicación | Descripción | Migrar a |
|---|---|---|---|
| `ImageUploader.jsx` | `admin/content/` | Upload a Supabase storage + URL manual + preview + cleanup de imagen anterior | `modules/admin/components/cms/ImageUploader.tsx` |
| `IconPicker.jsx` | `admin/content/` | Selector visual de iconos Lucide (búsqueda, paginación 100/pág, grid) | `modules/admin/components/cms/IconPicker.tsx` |
| `GradientProperty.jsx` | `admin/content/` | Selector dual de color (from/to), paleta 18 colores + HEX + color picker nativo. Output: `from-[#hex] to-[#hex]` | `modules/admin/components/cms/GradientPicker.tsx` |

### Editores por tipo de sección

| Tipo de sección | Campos editables | Componentes especiales usados |
|---|---|---|
| `hero` | badge, description (textarea), ctaPrimary, ctaSecondary, email, stats[max 3]{value, label}, imageLight, imageDark, backgroundColorDark | `ImageUploader` (x2: light/dark con botón copiar entre modos) |
| `feature_grid` | features[]{icon, title, description, color} (accordion colapsable por feature) | `IconPicker`, `GradientProperty` |
| `benefits` | image, imageAlt, benefits[]{text, schedule?} (accordion colapsable) | `ImageUploader` |
| `pricing` | Solo title/subtitle. Nota: "Los planes se gestionan desde `/admin/plans`" | Ninguno especial |
| `blog_section` | postsLimit (1-12), buttonText. Nota: "Los artículos se gestionan desde Admin > Blog" | Ninguno especial |
| `cta` | primaryButton{text, color}, secondaryButton{text}, benefits (texto pequeño), backgroundColor | `GradientProperty` (x2: botón + fondo) |

---

## Estructura de contenido JSONB por sección

### Hero
```json
{
  "badge": "Software #1 para MiPymes",
  "description": "Software contable especializado...",
  "ctaPrimary": "Comenzar",
  "ctaSecondary": "Soporte WhatsApp",
  "email": "soporte@contagracia.com",
  "stats": [
    { "value": "500+", "label": "Empresas Activas" },
    { "value": "99.9%", "label": "Tiempo Activo" },
    { "value": "Lunes a Viernes...", "label": "Soporte" }
  ],
  "imageDark": "/uploads/cms/gracia_dashboard_oscuro.jpg",
  "imageLight": "/uploads/cms/gracia_dashboard.png",
  "backgroundColorDark": "bg-slate-900"
}
```

### Feature Grid
```json
{
  "features": [
    {
      "icon": "Package",
      "title": "Gestión de Inventario",
      "description": "Control total de tu inventario...",
      "color": "from-purple-500 to-indigo-500"
    }
  ]
}
```

### Benefits
```json
{
  "image": "/uploads/cms/gracia_completo.png",
  "imageAlt": "Imagen ilustrativa",
  "benefits": [
    { "text": "Soporte personalizado", "schedule": "Lunes a Viernes: 8am - 5pm" }
  ]
}
```

### Pricing
```json
{}
```
> Lee planes desde `GET /admin/plans` (tabla `Plan` en schema-master). Campos usados: `name`, `description`, `price_monthly`, `days`, `invoice_limit`, `user_limit`, `modules[]`, `is_default`, `ctaText`.

### Blog Section
```json
{
  "titleGradient": "from-cyan-500 to-blue-600",
  "postsLimit": 3,
  "buttonText": "Ver todos los artículos"
}
```
> Lee posts desde endpoint de blog. Campos usados: `title`, `slug`, `published_at`, `content` (para excerpt).

### CTA
```json
{
  "primaryButton": { "text": "Prueba Gratuita 7 Días", "color": "from-purple-600 to-pink-600" },
  "secondaryButton": { "text": "Solicitar Demo" },
  "benefits": "Sin compromiso • Configuración en 5 minutos...",
  "backgroundColor": "from-purple-900/50 to-pink-900/50"
}
```

### Container (Page Builder)
```json
{
  "gridRows": 3,
  "gridColumns": 12,
  "cellHeight": 100,
  "gap": 16,
  "padding": 24,
  "backgroundPreset": "white",
  "backgroundColor": "#ffffff",
  "backgroundColorDark": "#1a1a1a",
  "borderRadius": 8,
  "showGridLines": true,
  "components": [
    {
      "id": "comp_abc123",
      "type": "heading",
      "props": {
        "content": "Bienvenido",
        "level": "h1",
        "alignment": "center",
        "color": "#000000",
        "gridRowStart": "1",
        "gridRowEnd": "2",
        "gridColumnStart": "1",
        "gridColumnEnd": "13",
        "padding": "8"
      }
    }
  ]
}
```

---

## Fase 1: Schema de base de datos (Prisma)

**Archivo:** `contagracia-shared-modules/prisma/schema-master.prisma`

> **Convención del proyecto:** Los modelos usan camelCase en Prisma + `@@map("snake_case")` para la tabla real. Campos en snake_case. Ver modelos existentes como `User`, `Company`, `Plan`.

### Modelos a crear

```prisma
model Page {
  id               String        @id @default(uuid())
  slug             String        @unique
  title            String
  description      String?
  page_type        String        @default("static") // landing, static, blog_list, legal, custom
  layout           String?
  show_in_header   Boolean       @default(false)
  show_in_footer   Boolean       @default(false)
  header_order     Int?
  footer_order     Int?
  header_label     String?
  footer_label     String?
  is_active        Boolean       @default(true)
  is_published     Boolean       @default(false)
  meta_title       String?
  meta_description String?
  og_title         String?
  og_description   String?
  og_image         String?
  settings         Json?
  created_at       DateTime      @default(now())
  updated_at       DateTime      @updatedAt
  published_at     DateTime?

  sections         SiteSection[]

  @@map("pages")
}

model SiteSection {
  id            String   @id @default(uuid())
  section_key   String
  section_type  String   // hero, feature_grid, benefits, pricing, blog_section, cta, container
  title         String?
  subtitle      String?
  content       Json?
  page_id       String
  page          Page     @relation(fields: [page_id], references: [id], onDelete: Cascade)
  is_active     Boolean  @default(true)
  display_order Int      @default(0)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@map("site_sections")
}
```

### Tareas

- [x] 1.1 Agregar modelos `Page` y `SiteSection` al `schema-master.prisma`
- [x] 1.2 Crear y ejecutar migración (`npx prisma migrate dev --name add-cms-tables`)
- [x] 1.3 Regenerar el cliente Prisma
- [x] 1.4 Crear seed con datos iniciales: página landing (slug: `home`) + 6 secciones default (hero, feature_grid, benefits, pricing, blog_section, cta) con el contenido JSONB documentado arriba

---

## Fase 2: Backend - Módulo CMS en admin-service

**Ubicación:** `admin-service/src/modules/cms/`

### Estructura del módulo

```
modules/cms/
├── cms.module.ts
├── controllers/
│   ├── pages.controller.ts
│   ├── sections.controller.ts
│   └── cms-public.controller.ts
├── services/
│   ├── pages.service.ts
│   ├── sections.service.ts
│   └── uploads.service.ts
└── dto/
    ├── index.ts
    ├── create-page.dto.ts
    ├── update-page.dto.ts
    ├── create-section.dto.ts
    ├── update-section.dto.ts
    └── reorder-sections.dto.ts
```

### Endpoints - Pages (protegidos con JWT)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/cms/pages` | Listar todas las páginas (con `_count` de secciones) |
| `GET` | `/admin/cms/pages/:id` | Obtener página con todas sus secciones |
| `POST` | `/admin/cms/pages` | Crear página |
| `PATCH` | `/admin/cms/pages/:id` | Actualizar metadatos de página |
| `DELETE` | `/admin/cms/pages/:id` | Eliminar página (cascade secciones) |

### Endpoints - Sections (protegidos con JWT)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/cms/pages/:pageId/sections` | Listar secciones de una página |
| `GET` | `/admin/cms/sections/:id` | Obtener sección individual |
| `POST` | `/admin/cms/pages/:pageId/sections` | Crear sección en página |
| `PATCH` | `/admin/cms/sections/:id` | Actualizar sección (contenido JSONB incluido) |
| `DELETE` | `/admin/cms/sections/:id` | Eliminar sección |
| `PATCH` | `/admin/cms/sections/reorder` | Reordenar secciones (recibe array `[{id, display_order}]`) |
| `PATCH` | `/admin/cms/sections/:id/toggle` | Toggle `is_active` |

### Endpoints - Uploads (protegidos con JWT)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/admin/cms/uploads` | Subir imagen (multipart/form-data). Guarda en servidor, retorna URL |
| `DELETE` | `/admin/cms/uploads` | Eliminar imagen por URL (cleanup) |

### Endpoints - Público (sin auth)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/cms/pages/:slug` | Obtener página publicada con secciones activas (filtro: `is_published=true`, `is_active=true`, order by `display_order`) |
| `GET` | `/cms/navigation` | Obtener navegación header (`show_in_header=true`, order by `header_order`) + footer (`show_in_footer=true`, order by `footer_order`) |

### Tareas

- [x] 2.1 Crear estructura de carpetas del módulo
- [x] 2.2 Crear DTOs con class-validator (`create-page.dto.ts`, `update-page.dto.ts`, `create-section.dto.ts`, `update-section.dto.ts`, `reorder-sections.dto.ts`)
- [x] 2.3 Implementar `PagesService` (CRUD + include sections con `_count` + filtro público)
- [x] 2.4 Implementar `SectionsService` (CRUD + reorder + toggle)
- [x] 2.5 Implementar `UploadsService` (guardar archivo en disco, generar URL, eliminar archivo anterior)
- [x] 2.6 Implementar `PagesController` con decoradores Swagger (`@ApiTags('cms-pages')`, `@ApiBearerAuth`)
- [x] 2.7 Implementar `SectionsController` con decoradores Swagger
- [x] 2.8 Implementar `CmsPublicController` (sin auth, solo endpoints públicos)
- [x] 2.9 Implementar `UploadsController` (multipart con `@UseInterceptors(FileInterceptor)`)
- [x] 2.10 Registrar `CmsModule` en `AppModule`
- [x] 2.11 Configurar carpeta de uploads y servir archivos estáticos (NestJS `ServeStaticModule` o similar)
- [x] 2.12 Probar endpoints con Swagger UI

---

## Fase 3: Frontend - Tipos y servicios CMS

**Seguir convenciones de:** `front_contagracia/ARQUITECTURA.md`

> Patrón existente en `admin.service.ts`: usa `adminClient` de `@/shared/services/api/apiClient`, base path `/admin`, métodos `get/create/update/delete` + entidad, retorna `response.data`.

### Estructura del módulo frontend

```
modules/admin/
├── types/
│   └── cms.types.ts          # Interfaces: Page, SiteSection, CreatePageDto, UpdatePageDto, etc.
├── services/
│   └── cms.service.ts        # adminClient calls: getPages, getPage, createPage, updatePage, deletePage, getSections, updateSection, reorderSections, toggleSection, uploadImage, deleteImage
├── hooks/
│   ├── usePages.ts           # TanStack Query: listar páginas
│   ├── usePage.ts            # TanStack Query: página con secciones
│   ├── useSections.ts        # TanStack Query: secciones de página
│   └── useCmsMutations.ts    # useMutation: create, update, delete, reorder, toggle, upload
└── components/
    └── cms/                  # Componentes específicos del CMS admin
        ├── ImageUploader.tsx
        ├── IconPicker.tsx
        └── GradientPicker.tsx
```

### Tareas

- [x] 3.1 Crear `cms.types.ts` con interfaces (Page, SiteSection, CreatePageDto, UpdatePageDto, CreateSectionDto, UpdateSectionDto, ReorderSectionDto, SectionContent por tipo)
- [x] 3.2 Crear `cms.service.ts` usando `adminClient` (seguir patrón de `admin.service.ts`)
- [x] 3.3 Crear hooks con TanStack Query (`usePages`, `usePage`, `useSections`)
- [x] 3.4 Crear hooks de mutación (`useCmsMutations`: createPage, updatePage, deletePage, createSection, updateSection, deleteSection, reorderSections, toggleSection, uploadImage)

---

## Fase 4: Frontend - Landing pública dinámica

**Objetivo:** Convertir `app/page.tsx` de hardcoded a data-driven.

### Componentes de sección a crear

```
shared/components/landing/sections/
├── HeroSection.tsx           # Migrar de horizont/Hero.jsx -> TS + Next.js Image
├── FeaturesSection.tsx       # Migrar de horizont/Features.jsx -> TS
├── BenefitsSection.tsx       # Migrar de horizont/Benefits.jsx -> TS
├── PricingSection.tsx        # Migrar de horizont/Pricing.jsx -> TS (consume GET /admin/plans)
├── BlogSection.tsx           # Migrar de horizont/BlogSection.jsx -> TS (consume endpoint blog)
├── CTASection.tsx            # Migrar de horizont/CTA.jsx -> TS
└── SectionRenderer.tsx       # Switch por section_type -> renderiza componente correcto
```

### Lógica

1. `page.tsx` llama al endpoint público `GET /cms/pages/home`
2. Recibe la página con sus secciones activas ordenadas por `display_order`
3. `SectionRenderer` renderiza cada sección según su `section_type`
4. Fallback a contenido hardcoded si la API no responde (para que la landing funcione sin backend)

### Consideraciones de migración por sección

| Sección | Detalles de migración |
|---|---|
| Hero | Framer Motion animations, dual image light/dark (`next/image`), stats grid, floating animated icons, gradient effects |
| Features | Grid 3 cols responsive, soporte colores HEX custom (`from-[#hex] to-[#hex]`) con inline styles, iconos Lucide dinámicos, hover effects |
| Benefits | 2 columnas (imagen + lista), checkmark icons con gradient, condicional `is_active` |
| Pricing | Fetch planes desde `GET /admin/plans`, agrupación de módulos por categoría, chips de color, dialog expandible, grid 4 cols |
| Blog | Fetch posts desde endpoint blog, excerpt (primeros 20 words), grid 3 cols, link a `/blog/:slug` |
| CTA | Gradientes customizables (botón + fondo), text gradient solo en dark mode, 2 botones |

### Tareas

- [x] 4.1 Crear `SectionRenderer.tsx` (switch por `section_type`)
- [x] 4.2 Migrar `HeroSection.tsx` (horizont -> Next.js + TS + `next/image`)
- [x] 4.3 Migrar `FeaturesSection.tsx` (cuidar soporte HEX colors en inline styles)
- [x] 4.4 Migrar `BenefitsSection.tsx`
- [x] 4.5 Migrar `PricingSection.tsx` (consumir `GET /admin/plans` existente)
- [x] 4.6 Migrar `BlogSection.tsx` (consumir endpoint blog)
- [x] 4.7 Migrar `CTASection.tsx`
- [x] 4.8 Crear servicio público `landing.service.ts` para fetch de página y navegación
- [x] 4.9 Refactorizar `app/page.tsx` para consumir secciones dinámicas con fallback
- [x] 4.10 Adaptar `Header.tsx` para leer navegación dinámica desde `GET /cms/navigation`
- [x] 4.11 Verificar dark mode en todas las secciones
- [x] 4.12 Verificar animaciones Framer Motion
- [x] 4.13 Verificar responsividad (mobile/tablet/desktop)

---

## Fase 5: Frontend - `/admin/landing` (editor de secciones)

**Objetivo:** Conectar la UI existente (mock data) al backend real + crear editores de contenido.

### Layout del editor

```
┌──────────────────────────────────────────────────────┐
│  Lista de secciones (izquierda)  │  Preview (derecha) │
│  - Toggle on/off                 │  Vista en vivo del │
│  - Reordenar (flechas/drag)      │  landing con los   │
│  - Botón "Editar"                │  cambios aplicados  │
│                                  │                     │
│  [Al hacer clic en Editar]       │                     │
│  Se abre editor específico       │                     │
│  por tipo de sección             │                     │
└──────────────────────────────────────────────────────┘
```

### Editores por tipo de sección (a crear)

| Tipo | Componente editor | Campos | Componentes especiales |
|---|---|---|---|
| `hero` | `HeroEditor.tsx` | badge, description, ctaPrimary, ctaSecondary, email, stats[max 3], imageLight, imageDark, backgroundColorDark | `ImageUploader` x2 (con botón copiar entre light/dark) |
| `feature_grid` | `FeaturesEditor.tsx` | features[] con accordion colapsable: icon, title, description, color | `IconPicker`, `GradientPicker` |
| `benefits` | `BenefitsEditor.tsx` | image, imageAlt, benefits[] con accordion: text, schedule | `ImageUploader` |
| `pricing` | `PricingEditor.tsx` | Solo title, subtitle + nota informativa "gestionar en /admin/plans" | Ninguno |
| `blog_section` | `BlogEditor.tsx` | postsLimit (1-12), buttonText + nota informativa | Ninguno |
| `cta` | `CTAEditor.tsx` | primaryButton{text, color}, secondaryButton{text}, benefits, backgroundColor | `GradientPicker` x2 |

### Tareas

- [x] 5.1 Reemplazar mock data en `/admin/landing/page.tsx` por hooks reales (`useSections` del landing)
- [x] 5.2 Implementar toggle de secciones (llamada a `toggleSection` mutation)
- [x] 5.3 Implementar reordenamiento de secciones (flechas arriba/abajo o drag & drop)
- [x] 5.4 Migrar `ImageUploader.tsx` (upload a servidor local vía `POST /admin/cms/uploads`, cleanup de imagen anterior vía `DELETE`)
- [x] 5.5 Migrar `IconPicker.tsx` (selector visual Lucide con búsqueda y paginación)
- [x] 5.6 Migrar `GradientPicker.tsx` (selector dual de color, paleta + HEX + nativo)
- [x] 5.7 Crear `HeroEditor.tsx`
- [x] 5.8 Crear `FeaturesEditor.tsx` (accordion de features)
- [x] 5.9 Crear `BenefitsEditor.tsx` (accordion de benefits)
- [x] 5.10 Crear `PricingEditor.tsx` (solo title/subtitle + nota)
- [x] 5.11 Crear `BlogEditor.tsx` (postsLimit + buttonText + nota)
- [x] 5.12 Crear `CTAEditor.tsx`
- [x] 5.13 Crear `SectionEditorRouter.tsx` (switch que muestra el editor correcto según `section_type`)
- [x] 5.14 Implementar preview inline (panel derecho renderizando la sección con datos en vivo)

---

## Fase 6: Frontend - `/admin/cms` (gestión de páginas)

**Objetivo:** Conectar la UI existente (mock data) al backend real.

### Funcionalidades

- CRUD de páginas con dialog de creación
- Configuración de navegación (header/footer con labels y orden)
- Configuración SEO (meta_title, meta_description, og_title, og_description, og_image)
- Estado: activo/inactivo + borrador/publicado
- Badge visual de estado ("Publicado", "Borrador", "Inactivo")
- Enlace al Page Builder para páginas con secciones tipo `container`

### Tareas

- [x] 6.1 Reemplazar mock data en `/admin/cms/page.tsx` por hooks reales (`usePages`)
- [x] 6.2 Implementar creación de páginas (dialog existente -> `createPage` mutation)
- [x] 6.3 Implementar edición de metadatos (navegación, SEO, estado)
- [x] 6.4 Implementar toggle publicación (`is_published`) con actualización de `published_at`
- [x] 6.5 Implementar eliminación con dialog de confirmación
- [x] 6.6 Filtros funcionales (por tipo, por estado)
- [x] 6.7 Búsqueda por título/slug
- [x] 6.8 Botón "Editar página" que navega al Page Builder (`/admin/cms/page/:id/builder`)

---

## Fase 7: Frontend - Page Builder visual

**Objetivo:** Migrar el builder tipo Elementor para editar páginas con secciones `container`.

### Ruta

`/admin/cms/page/[pageId]/builder`

### Componentes principales

```
app/admin/cms/page/[pageId]/builder/
└── page.tsx

modules/admin/components/cms/page-builder/
├── PageBuilder.tsx            # Layout 3 paneles (sidebar | canvas | library)
├── BuilderContext.tsx         # Estado: secciones[], selectedSection, selectedComponent, history[], historyIndex
├── BuilderCanvas.tsx          # Canvas central con grid visual (celdas clickeables)
├── BuilderSidebar.tsx         # Panel izq: tabs Contenido/Estilo, propiedades del componente seleccionado
├── BuilderLibrary.tsx         # Panel der: biblioteca de bloques y componentes arrastrables
├── BuilderToolbar.tsx         # Barra superior: Undo, Redo, Viewport (desktop/tablet/mobile), Guardar, Vista Previa
├── BlockRegistry.ts           # Registro de tipos de bloque (container) con props default
├── ComponentRegistry.ts       # Registro de componentes con props default, categorías, iconos
├── components/
│   ├── ComponentRenderer.tsx  # Renderiza componente en canvas (con borde de selección, handles)
│   └── CellSelector.tsx       # Modal visual: grid donde seleccionas celda de destino (row/col start-end)
└── preview/
    ├── BuilderPreviewModal.tsx # Modal fullscreen con preview de la página construida
    ├── BlockPreview.tsx        # Preview de un bloque (switch section_type -> componente o grid)
    └── ComponentPreview.tsx    # Preview de un componente individual (sin controles de edición)
```

### Funcionalidades clave

- Grid visual 12 columnas con filas configurables
- Drag & drop de componentes desde biblioteca al canvas (`@dnd-kit`)
- Selector de celda (modal con grid visual) al agregar componente
- Panel de propiedades con tabs (Contenido / Estilo) según tipo de componente
- Undo/Redo con stack de historial (push en cada cambio, navigate con Ctrl+Z / Ctrl+Shift+Z)
- Viewport modes: desktop (100%) / tablet (768px) / mobile (375px)
- Dirty state tracking (indicador de cambios sin guardar)
- Guardar al backend (`PATCH /admin/cms/sections/:id` con contenido JSONB)
- Preview en modal fullscreen (renderiza la página tal como se vería publicada)

### Componentes del builder (15+)

| Componente | Categoría | Props principales |
|---|---|---|
| `heading` | Texto | content, level (h1-h6), alignment, color, fontSize, verticalAlign |
| `text` | Texto | content, alignment, color, fontSize, verticalAlign |
| `image` | Media | src, alt, objectFit, borderRadius, alignment |
| `button` | Interactivo | text, url, variant (solid/outline/ghost), size, bgColor, alignment |
| `spacer` | Layout | height |
| `divider` | Layout | color, thickness, style (solid/dashed/dotted) |
| `video` | Media | url (YouTube/Vimeo), aspectRatio, autoplay, borderRadius |
| `icon` | Media | iconName (Lucide), size, color, alignment |
| `card` | Contenido | imageSrc, title, description, buttonText, colors, padding |
| `gallery` | Media | imageUrl, alt, objectFit, borderRadius |
| `columns` | Layout | columnCount (2-4), columnRatio, gap, bgColor |
| `testimonial` | Contenido | photoUrl, name, position, quote, layout (horizontal/vertical), colors |
| `stat` | Contenido | value, label, iconName, layout, colors |

### Posicionamiento (grid Excel-like)

Cada componente tiene props de posición:
- `gridRowStart`, `gridRowEnd` (fila inicio/fin, 1-indexed)
- `gridColumnStart`, `gridColumnEnd` (columna inicio/fin, 1-indexed, 13 = full width)
- `padding` (padding interno)

### Tareas

- [x] 7.1 Instalar `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [x] 7.2 Crear ruta `/admin/cms/page/[pageId]/builder/page.tsx`
- [x] 7.3 Crear `BuilderContext.tsx` (useReducer con acciones: addSection, removeSection, selectSection, addComponent, removeComponent, selectComponent, updateComponentProps, undo, redo)
- [x] 7.4 Crear `BlockRegistry.ts` y `ComponentRegistry.ts` (tipados en TS, props default por componente)
- [x] 7.5 Implementar `PageBuilder.tsx` (layout 3 paneles responsive)
- [x] 7.6 Implementar `BuilderToolbar.tsx` (undo, redo, viewport, guardar, preview)
- [x] 7.7 Implementar `BuilderCanvas.tsx` con grid visual (celdas, guías)
- [x] 7.8 Implementar `BuilderLibrary.tsx` con componentes agrupados por categoría
- [x] 7.9 Implementar `BuilderSidebar.tsx` con panel de propiedades (tabs Contenido/Estilo)
- [x] 7.10 Implementar `ComponentRenderer.tsx` para cada tipo de componente (13 componentes)
- [x] 7.11 Integrar `@dnd-kit` para drag & drop (library -> canvas)
- [x] 7.12 Implementar `CellSelector.tsx` (modal visual de selección de celda en grid)
- [x] 7.13 Implementar undo/redo (history stack)
- [x] 7.14 Implementar viewport modes (desktop/tablet/mobile con resize del canvas)
- [x] 7.15 Implementar guardado al backend (serializar secciones a JSONB, `PATCH` mutation)
- [x] 7.16 Implementar dirty state (indicador "Cambios sin guardar", confirmación al salir)
- [x] 7.17 Implementar `BuilderPreviewModal.tsx` (modal fullscreen con `BlockPreview` + `ComponentPreview`)

---

## Fase 8: Rendering público de páginas CMS

**Objetivo:** Que las páginas creadas en el CMS se rendericen en rutas públicas.

### Ruta

`app/[slug]/page.tsx` - Ruta dinámica para páginas CMS

### Lógica

1. Next.js recibe el slug
2. Llama a `GET /cms/pages/:slug` (endpoint público)
3. Si la página existe, `is_published=true`, y `is_active=true` -> renderiza
4. Secciones predefinidas (hero, features, etc.) -> usa los mismos componentes de la Fase 4
5. Secciones tipo `container` -> renderiza `GridContainer` con `ComponentPreview` por cada componente
6. Si no existe o no está publicada -> retorna 404
7. SEO: `generateMetadata` usa `meta_title`, `meta_description`, `og_*` de la página

### Componentes reutilizados

```
shared/components/landing/sections/
├── SectionRenderer.tsx        # Ya creado en Fase 4 (switch por section_type)
├── GridContainer.tsx           # NUEVO: renderiza secciones tipo "container" (grid CSS)
└── components/
    └── ComponentPreview.tsx    # NUEVO: renderiza componentes del builder sin controles de edición
```

### Tareas

- [x] 8.1 Crear ruta dinámica `app/[slug]/page.tsx`
- [x] 8.2 Implementar `GridContainer.tsx` (CSS Grid con props del container: rows, cols, gap, padding, background)
- [x] 8.3 Implementar `ComponentPreview.tsx` para cada tipo de componente (versión read-only del ComponentRenderer)
- [x] 8.4 Extender `SectionRenderer.tsx` para soportar `section_type: 'container'` -> `GridContainer`
- [x] 8.5 Manejar 404 para slugs inexistentes o páginas no publicadas (`notFound()`)
- [x] 8.6 Implementar `generateMetadata` para SEO dinámico (meta_title, meta_description, og_title, og_description, og_image)
- [x] 8.7 Evitar conflicto con rutas existentes (`/auth/*`, `/admin/*`, `/dashboard/*`, `/blog/*`)

---

## Orden de ejecución recomendado

```
Fase 1 (DB) ──> Fase 2 (Backend API) ──> Fase 3 (Types + Services)
                                              │
                                    ┌─────────┼─────────┐
                                    v         v         v
                               Fase 4     Fase 5     Fase 6
                             (Landing)  (/landing)   (/cms)
                                    │                   │
                                    v                   v
                               Fase 8              Fase 7
                            (Público)           (Page Builder)
```

Las fases 4, 5 y 6 pueden trabajarse en paralelo una vez completada la fase 3.
La fase 8 depende de la 4 (componentes de sección) + la 7 (GridContainer para containers).

---

## Dependencias npm a instalar

### Backend (admin-service)
- `multer` + `@nestjs/platform-express` (para uploads de imágenes, verificar si ya está incluido en NestJS)
- Ya tiene: NestJS, Prisma, class-validator, class-transformer, Swagger

### Frontend (front_contagracia)
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` - Drag & drop (Page Builder)
- Ya tiene: `framer-motion`, `lucide-react`, `axios`, `zustand`, `react` 19, `next` 16
- Verificar: `@tanstack/react-query` (necesario para hooks)

---

## Archivos de referencia del proyecto viejo (horizont)

| Archivo viejo | Qué contiene | Relevante para fase |
|---|---|---|
| `supabase/migrations/supabase-cms-migration.sql` | Schema inicial `site_sections` | 1 |
| `supabase/migrations/phase1-pages-migration.sql` | Schema `pages` + RPCs | 1 |
| `supabase/migrations/20250120_page_builder_storage_policies.sql` | Storage policies (bucket `page-builder-images`) | 2 (uploads) |
| `src/hooks/useSiteSections.js` | Hooks de Supabase para pages/sections | 3 |
| `src/pages/LandingPage.jsx` | Landing page con dynamic sections | 4 |
| `src/components/landing/Hero.jsx` | Hero section | 4 |
| `src/components/landing/Features.jsx` | Features section | 4 |
| `src/components/landing/Benefits.jsx` | Benefits section | 4 |
| `src/components/landing/Pricing.jsx` | Pricing section (lee tabla plans) | 4 |
| `src/components/landing/BlogSection.jsx` | Blog section (lee posts vía RPC) | 4 |
| `src/components/landing/CTA.jsx` | CTA section | 4 |
| `src/pages/admin/ContentManagement.jsx` | Entry point editor de secciones | 5 |
| `src/components/admin/content/SectionContentEditor.jsx` | Editor de contenido por sección | 5 |
| `src/components/admin/content/ImageUploader.jsx` | Uploader de imágenes | 5 |
| `src/components/admin/content/IconPicker.jsx` | Selector de iconos Lucide | 5 |
| `src/components/admin/content/GradientProperty.jsx` | Selector de gradientes | 5 |
| `src/components/admin/CMSManagerNew.jsx` | Gestión de páginas CMS | 6 |
| `src/components/admin/page-builder/PageBuilder.jsx` | Page Builder layout 3 paneles | 7 |
| `src/components/admin/page-builder/BuilderContext.jsx` | Estado del builder | 7 |
| `src/components/admin/page-builder/BuilderCanvas.jsx` | Canvas del builder | 7 |
| `src/components/admin/page-builder/BuilderSidebar.jsx` | Panel de propiedades | 7 |
| `src/components/admin/page-builder/BuilderLibrary.jsx` | Biblioteca de componentes | 7 |
| `src/components/admin/page-builder/BlockRegistry.js` | Registro de bloques | 7 |
| `src/components/admin/page-builder/ComponentRegistry.js` | Registro de componentes | 7 |
| `src/components/admin/page-builder/components/ComponentRenderer.jsx` | Renderer en canvas | 7 |
| `src/components/admin/page-builder/components/CellSelector.jsx` | Selector de celda | 7 |
| `src/components/admin/page-builder/preview/BlockPreview.jsx` | Preview de bloque/sección | 7, 8 |
| `src/pages/ContentPage.jsx` | Renderiza páginas CMS públicas (ruta `/p/:slug`) | 8 |

---

## Notas importantes

- Todo el frontend sigue las convenciones de `ARQUITECTURA.md`: feature-based, TypeScript estricto, hooks con TanStack Query, services con axios, componentes PascalCase, naming con sufijos `.types.ts`, `.service.ts`, etc.
- Los endpoints protegidos usan `@UseGuards(JwtAuthGuard)` y decoradores `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`
- El schema Prisma usa convención snake_case con `@@map()` para nombres de tabla (consistente con modelos existentes como `User`, `Company`, `Plan`)
- El contenido de las secciones se almacena como JSONB (`Json?` en Prisma), lo que permite flexibilidad sin cambiar el schema
- Las imágenes se almacenan en el servidor local (no Supabase Storage), con cleanup automático al reemplazar
- NO hay editores rich text (TipTap, Quill) - todo se maneja con inputs y textareas planos
- Los colores/gradientes soportan tanto clases Tailwind predefinidas como HEX custom (`from-[#hex] to-[#hex]`)
- El Page Builder es la fase más compleja; las fases 1-6 permiten tener un CMS funcional sin el builder
