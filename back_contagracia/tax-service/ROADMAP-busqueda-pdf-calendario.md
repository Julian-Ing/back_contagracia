# Hoja de Ruta: Buscador Fuzzy + Descarga PDF — Calendario Tributario

**Fecha:** 2026-02-12
**Scope:** Frontend (`front_contagracia`)
**Estado:** COMPLETADO

---

## Objetivo

Agregar dos funcionalidades al calendario tributario (`/dashboard/tax-calendar`):

1. **Búsqueda por texto (fuzzy search)** — filtrar obligaciones por nombre o período
2. **Descarga PDF** — exportar obligaciones visibles como PDF (por mes, semestre o año)

---

## Feature 1: FuzzySearchInput (componente compartido)

### CREAR: `src/shared/components/ui/fuzzy-search-input.tsx`

- [x] Input con icono `Search` (izq) y botón `X` para limpiar (der)
- [x] Debounce 300ms configurable (`debounceMs` prop)
- [x] Al limpiar → `onChange('')` inmediato sin debounce
- [x] Props: `value`, `onChange`, `placeholder`, `className`, `disabled`, `debounceMs`
- [x] Dark mode, `cn()`, focus ring — mismos estilos que `input.tsx`
- [x] Componente presentacional — el padre decide cómo filtrar

### MODIFICAR: `src/app/dashboard/tax-calendar/page.tsx` — Búsqueda

- [x] Estado `searchQuery` + `setSearchQuery`
- [x] Helper `matchesSearch(obl)` usando `normalizeText` de `@/shared/lib/fuzzy-search`
- [x] Memos filtrados: `filteredUpcoming`, `filteredCalendar`, `filteredYear`
- [x] `<FuzzySearchInput>` visible en las 3 pestañas
- [x] Mensaje "Sin resultados para búsqueda" cuando 0 matches con datos

---

## Feature 2: Descarga PDF

### Instalar dependencias

- [x] `jspdf` 4.1.0 + `jspdf-autotable` 5.0.7

### CREAR: `src/modules/tax-calendar/utils/generateObligationsPdf.ts`

- [x] Logo de empresa (carga async desde URL)
- [x] Header: nombre empresa (bold 16pt), NIT con último dígito, scope
- [x] Fecha de generación + "Fuente: DIAN" (esquina derecha)
- [x] Tabla: Obligación, Período, Fecha Vencimiento, Tipo
- [x] Estilo: header indigo, filas alternadas, font 9pt
- [x] Footer: línea separadora, link clickeable a calendario DIAN, número de página
- [x] Usa `jsPDF` + `autoTable`

### MODIFICAR: `src/app/dashboard/tax-calendar/page.tsx` — Botón PDF

- [x] Botón "Descargar PDF" con `DropdownMenu` en el header
- [x] Opciones: Mes actual, Semestre actual, Año completo
- [x] Helper `formatOblForPdf()` para mapear campos
- [x] Datos de empresa desde `useAuthStore` + hook `company`
- [x] Carga async de datos del año si no están disponibles

---

## Archivos

| Archivo | Acción | Estado |
|---------|--------|--------|
| `src/shared/components/ui/fuzzy-search-input.tsx` | **CREADO** | ✅ |
| `src/modules/tax-calendar/utils/generateObligationsPdf.ts` | **CREADO** | ✅ |
| `src/app/dashboard/tax-calendar/page.tsx` | **MODIFICADO** | ✅ |
| `front_contagracia/package.json` | **MODIFICADO** (jspdf) | ✅ |

---

## Verificación

- [x] Escribir "renta" → solo obligaciones con "renta"
- [x] Limpiar búsqueda → vuelven todas
- [x] PDF > Mes actual → descarga tabla del mes
- [x] PDF > Semestre actual → descarga semestre
- [x] PDF > Año completo → descarga todo el año
- [x] Buscador funciona en las 3 pestañas
- [x] Logo de empresa en PDF
- [x] Link clickeable a DIAN en footer del PDF
