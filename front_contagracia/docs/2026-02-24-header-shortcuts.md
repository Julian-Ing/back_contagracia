# Accesos rápidos en Header — Calendario Tributario y Evento Radian

**Fecha:** 2026-02-24

## Resumen

Se movieron "Calendario Tributario" y "Evento Radian" del sidebar al header como iconos de acceso rápido, liberando espacio en el menú lateral. Se creó la página en blanco de Evento Radian.

## Cambios

### 1. Sidebar — Remoción de items (`src/config/navigation.ts`)

- Removido item `calendario-tributario` (módulo `tax`, permiso `tax_calendar.view`, `adminOnly`)
- Removido item `radian` (módulo `electronic_documents`, permiso `electronic_documents.radian.view`)
- Centro de Costos permanece en el sidebar

### 2. Header — Iconos de acceso rápido (`src/shared/components/layout/Header.tsx`)

- Agregados 2 botones con tooltip antes de notificaciones:
  - `CalendarDays` → `/dashboard/tax-calendar` (hover naranja)
    - Visible si: módulo `tax` + permiso `tax_calendar.view`
  - `GitBranch` → `/dashboard/received-invoices` (hover indigo)
    - Visible si: módulo `electronic_documents` + permiso `electronic_documents.radian.view`
- Separador vertical (`div w-px`) entre accesos rápidos y acciones existentes
- Imports agregados: `CalendarDays`, `GitBranch`, `usePermissions`

### 3. Página en blanco — Evento Radian (nueva)

**Archivo:** `src/app/dashboard/received-invoices/page.tsx`

- Placeholder con icono GitBranch, título "Evento Radian", descripción y label "Próximamente"
- Ruta: `/dashboard/received-invoices`

## Permisos

| Acceso | Módulo | Permiso | Notas |
|---|---|---|---|
| Calendario Tributario | `tax` | `tax_calendar.view` | Era `adminOnly` en sidebar, ahora solo valida módulo+permiso |
| Evento Radian | `electronic_documents` | `electronic_documents.radian.view` | Página placeholder |
