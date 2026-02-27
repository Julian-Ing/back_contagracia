# Hoja de Ruta - Responsividad del Page Builder + Flex Container

> **Dependencia:** Completado `CMS_MIGRATION_ROADMAP.md` (Fases 1-8)
> **Fecha de creacion:** 2026-01-29
> **Alcance:** Solo `/admin/cms` (Page Builder). NO aplica a `/admin/landing` (secciones predefinidas)

---

## Resumen

Agregar responsividad real al Page Builder (`/admin/cms`) y un nuevo tipo de bloque Flex Container. Actualmente los 3 botones de viewport (desktop/tablet/mobile) solo cambian el ancho visual del canvas; los componentes no cambian sus propiedades. El objetivo es que cada componente y cada contenedor permitan ajustar propiedades por breakpoint, y que el renderizado publico use CSS media queries.

**Fuera de alcance:** Las secciones de `/admin/landing` (hero, features, benefits, pricing, blog, cta) ya manejan su responsividad con Tailwind CSS y se abordaran por separado.

---

## Decisiones de diseno

| Decision | Valor |
|---|---|
| Estrategia de breakpoints | Desktop-first con overrides (herencia) |
| Almacenamiento | Campo `_responsive` dentro de props existentes (JSONB) |
| Breakpoints | desktop (base), tablet (<=1024px), mobile (<=768px) |
| Nuevo bloque | `flex-container` (alternativa al Grid Container) |
| Renderizado publico | CSS media queries via `<style>` scoped por seccion |
| Backward compatibility | Sin migracion. Datos sin `_responsive` = solo desktop |

---

## Modelo de datos

### Props de componente con responsive

```json
{
  "id": "comp_123",
  "type": "heading",
  "props": {
    "content": "Titulo",
    "fontSize": 0,
    "gridColumnStart": 1,
    "gridColumnEnd": 13,
    "visibility": "visible",
    "_responsive": {
      "tablet": {
        "gridColumnStart": 1,
        "gridColumnEnd": 13,
        "fontSize": 24
      },
      "mobile": {
        "gridColumnStart": 1,
        "gridColumnEnd": 13,
        "fontSize": 18,
        "visibility": "hidden"
      }
    }
  }
}
```

### Content de seccion con responsive

```json
{
  "gridRows": 3,
  "gridColumns": 12,
  "cellHeight": 100,
  "gap": 16,
  "padding": 24,
  "backgroundPreset": "white",
  "_responsive": {
    "tablet": { "gridColumns": 6, "gap": 12, "padding": 16 },
    "mobile": { "gridColumns": 1, "gap": 8, "padding": 12, "cellHeight": 80 }
  }
}
```

### Propiedades responsive vs globales

**Responsive** (varian por breakpoint):
- `gridRowStart`, `gridRowEnd`, `gridColumnStart`, `gridColumnEnd` - posicion en grid
- `fontSize` - tamano de texto
- `padding` - espaciado interno
- `alignment`, `verticalAlign` - alineacion
- `visibility` - NUEVA: `"visible"` / `"hidden"`
- Container: `gridRows`, `gridColumns`, `gap`, `padding`, `cellHeight`
- Flex: `direction`, `justifyContent`, `alignItems`, `gap`, `padding`
- Flex hijos: `flexBasis`, `flexGrow`, `order`

**Globales** (mismas en todos los breakpoints):
- `content`, `text`, `quote`, `name` - contenido textual
- `src`, `url`, `imageUrl` - fuentes de media
- `color`, `bgColor`, `autoColor` - colores
- `variant`, `objectFit`, `borderRadius` - estilos fijos
- `level` (h1-h6) - semantica (ahora responsive)

---

## Fase 1: Utilidades de resolucion de props

**Archivos:**
- `ComponentRegistry.ts` - agregar flag `responsive: true`
- Nuevo: `modules/admin/utils/responsive.utils.ts`

### Tareas

- [x] 1.1 Crear `resolveProps(props, viewport)`: retorna props base mergeadas con `_responsive[viewport]`
- [x] 1.2 Crear `resolveContent(content, viewport)`: lo mismo para contenido de seccion
- [x] 1.3 Agregar `responsive: true` a las propiedades correspondientes en `ComponentRegistry.ts`
- [x] 1.4 Agregar propiedad `visibility` (select: visible/hidden) a todos los componentes con `responsive: true`
- [x] 1.5 Agregar `responsive: true` a las propiedades correspondientes en `BlockRegistry.ts`

---

## Fase 2: BuilderContext - Escritura responsive

**Archivos:**
- `BuilderContext.tsx`

### Tareas

- [x] 2.1 Modificar accion `UPDATE_COMPONENT`: cuando `viewportMode != 'desktop'`, escribir en `props._responsive[viewport]` en vez de en props raiz
- [x] 2.2 Modificar accion `UPDATE_SECTION_LAYOUT`: cuando `viewportMode != 'desktop'`, escribir en `content._responsive[viewport]`
- [x] 2.3 Exponer `resolveProps` y `resolveContent` en el contexto del builder
- [x] 2.4 Agregar accion `CLEAR_RESPONSIVE_OVERRIDE` para resetear un override de propiedad a heredar de desktop

---

## Fase 3: BuilderSidebar - UI responsive

**Archivos:**
- `BuilderSidebar.tsx`

### Tareas

- [x] 3.1 Para propiedades con `responsive: true`, mostrar indicador del viewport activo (icono monitor/tablet/phone)
- [x] 3.2 Mostrar boton "Reset" junto a propiedades que tienen override en el viewport actual
- [x] 3.3 Los valores mostrados en el sidebar vienen de `resolveProps` segun viewport activo
- [x] 3.4 Las ediciones en viewport != desktop escriben en `_responsive` via la accion modificada

---

## Fase 4: BuilderCanvas - Renderizado responsive en editor

**Archivos:**
- `BuilderCanvas.tsx`
- `ComponentRenderer.tsx`

### Tareas

- [x] 4.1 Grid Container: leer props del contenedor con `resolveContent` segun viewport
- [x] 4.2 Componentes: leer posicion con `resolveProps` segun viewport
- [x] 4.3 Componentes con `visibility: "hidden"` en el viewport actual se renderizan con opacidad baja + badge "Oculto" en el editor (no se ocultan completamente para poder seleccionarlos)

---

## Fase 5: Flex Container (nuevo bloque)

**Archivos:**
- `BlockRegistry.ts` - agregar definicion
- `ComponentRegistry.ts` - agregar `FLEX_POSITION_PROPS`
- `BuilderCanvas.tsx` - agregar `FlexComponentsArea`
- `BuilderContext.tsx` - detectar tipo de seccion al agregar componente
- `BuilderLibrary.tsx` - mostrar nuevo bloque
- Nuevo: `FlexSection.tsx` (renderizado publico)

### Definicion del bloque

```
flex-container:
  - direction: row | column | row-reverse | column-reverse (responsive)
  - wrap: nowrap | wrap
  - justifyContent: flex-start | center | flex-end | space-between | space-around | space-evenly (responsive)
  - alignItems: flex-start | center | flex-end | stretch (responsive)
  - gap: number (responsive)
  - padding: number (responsive)
  - backgroundPreset: mismos que container
  - backgroundColor: color
  - borderRadius: number
```

### Props de posicion flex (hijos)

```
FLEX_POSITION_PROPS:
  - flexBasis: text (ej: "auto", "50%", "300px") (responsive)
  - flexGrow: select 0|1 (responsive)
  - order: number 0-20 (responsive)
  - padding: number
```

### Tareas

- [x] 5.1 Agregar bloque `flex-container` a `BlockRegistry.ts`
- [x] 5.2 Crear `FLEX_POSITION_PROPS` en `ComponentRegistry.ts`
- [x] 5.3 Detectar tipo de seccion en `addComponent`: si es `flex-container`, usar `FLEX_POSITION_PROPS` en vez de `GRID_POSITION_PROPS` y no mostrar CellSelector
- [x] 5.4 Crear `FlexComponentsArea` en `BuilderCanvas.tsx` (renderiza hijos con flexbox)
- [x] 5.5 Rutear en `BuilderCanvas` segun `section_type`: container -> grid, flex-container -> flex
- [x] 5.6 Crear `FlexSection.tsx` para renderizado publico
- [x] 5.7 Actualizar `SectionRenderer.tsx` para rutear `flex-container` -> `FlexSection`

---

## Fase 6: Renderizado publico responsive

**Archivos:**
- `ContainerSection.tsx`
- `FlexSection.tsx`
- `SectionRenderer.tsx`

### Estrategia

Generar `<style>` scoped por seccion con CSS media queries:

```css
/* Desktop (base) */
.section-abc { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.comp-xyz { grid-column: 1 / 7; grid-row: 1 / 2; }

/* Tablet */
@media (max-width: 1024px) {
  .section-abc { grid-template-columns: repeat(6, 1fr); gap: 12px; }
  .comp-xyz { grid-column: 1 / 7; }
}

/* Mobile */
@media (max-width: 768px) {
  .section-abc { grid-template-columns: repeat(1, 1fr); gap: 8px; }
  .comp-xyz { grid-column: 1 / 2; display: none; /* visibility: hidden */ }
}
```

### Tareas

- [x] 6.1 Modificar `ContainerSection.tsx`: generar CSS media queries con `<style>` scoped en vez de inline styles para grid/posicion
- [x] 6.2 Crear `FlexSection.tsx` con CSS media queries para flex containers
- [x] 6.3 Actualizar `SectionRenderer.tsx` para rutear `flex-container`
- [x] 6.4 Componentes con `visibility: "hidden"` -> `display: none` via media query
- [x] 6.5 Verificar que la landing predefinida (hero, features, etc.) no se afecta (solo aplica a container/flex-container)

---

## Fase 7: Polish y UX

### Tareas

- [x] 7.1 Boton "Copiar desktop a tablet" y "Copiar desktop a mobile" para inicializar overrides con los valores actuales de desktop
- [ ] 7.2 Indicador visual en toolbar cuando hay overrides definidos para el viewport actual
- [ ] 7.3 En la lista de secciones (panel izquierdo), mostrar badge si la seccion tiene overrides responsive

---

## Orden de ejecucion

```
Fase 1 (Utils) --> Fase 2 (Context) --> Fase 3 (Sidebar)
                                              |
                                    +---------+---------+
                                    v                   v
                               Fase 4              Fase 5
                             (Canvas)         (Flex Container)
                                    |                   |
                                    +---------+---------+
                                              v
                                         Fase 6
                                    (Publico responsive)
                                              |
                                              v
                                         Fase 7
                                        (Polish)
```

Las fases 4 y 5 pueden trabajarse en paralelo una vez completada la fase 3.

---

## Notas importantes

- **Zero migracion**: datos existentes sin `_responsive` funcionan igual (desktop-only)
- **Undo/redo sin cambios**: el historial ya guarda snapshots completos de `sections[]`; el campo `_responsive` es parte del snapshot
- **Backend sin cambios**: el contenido se guarda como JSONB libre, no hay validacion de campos responsive
- **Breakpoints fijos**: desktop (base), tablet (<=1024px), mobile (<=768px). No hay breakpoints custom
- **Las secciones predefinidas** (hero, features, benefits, pricing, blog, cta) tienen su propia responsividad via Tailwind CSS y NO se ven afectadas por este sistema
