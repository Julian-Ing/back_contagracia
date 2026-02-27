# Módulo electronic_documents — Permisos y Seeds

**Fecha:** 2026-02-17

## Resumen

Se creó el módulo `electronic_documents` que centraliza todos los permisos relacionados con DIAN, resoluciones y RADIAN. Anteriormente estos permisos estaban dispersos en `sales`, `expenses`, `company_profile` y el módulo separado `radian`.

## Cambios

### Nuevo módulo: `electronic_documents`

- **module_key:** `electronic_documents`
- **module_name:** Documentos Electrónicos
- **description:** Documentos electrónicos, resoluciones y radian
- **icon:** FileCheck
- **group:** Operaciones
- **sort_order:** 15
- **Sin dependencias**

### 17 permisos creados

| action_key | Descripción |
|------------|-------------|
| `electronic_documents.configure` | Configurar ambiente y conexión DIAN |
| `electronic_documents.resolutions.view` | Ver resoluciones de facturación |
| `electronic_documents.resolutions.create` | Crear resolución |
| `electronic_documents.resolutions.edit` | Editar resolución |
| `electronic_documents.invoices.send` | Enviar factura electrónica a DIAN |
| `electronic_documents.invoices.view_status` | Ver estado de envío de factura |
| `electronic_documents.credit_notes.send` | Enviar nota crédito a DIAN |
| `electronic_documents.debit_notes.send` | Enviar nota débito a DIAN |
| `electronic_documents.support_docs.send` | Enviar documento soporte a DIAN |
| `electronic_documents.radian.view` | Ver facturas recibidas electrónicas |
| `electronic_documents.radian.import` | Importar facturas recibidas de DIAN |
| `electronic_documents.radian.accept` | Aceptar factura recibida |
| `electronic_documents.radian.reject` | Rechazar factura recibida |
| `electronic_documents.radian.events.send` | Enviar eventos RADIAN a DIAN |
| `electronic_documents.radian.events.view` | Ver eventos RADIAN enviados |
| `electronic_documents.radian.export` | Exportar facturas recibidas |

### Permisos eliminados de otros módulos

**De `sales`:**
- `sales.invoices.send_dian`
- `sales.credit_notes.send_dian`
- `sales.debit_notes.send_dian`
- `sales.resolutions.sync_dian`
- `sales.resolutions.view`
- `sales.resolutions.create`
- `sales.resolutions.edit`

**De `expenses`:**
- `expenses.send_dian`

**De `company_profile`:**
- `company.dian.configure`

### Módulo `radian` eliminado

El módulo `radian` fue absorbido completamente por `electronic_documents`. Se eliminó de `definitions.ts`, `index.ts` y `seed-plans.ts`.

### Planes actualizados

- **Profesional:** `'radian'` → `'electronic_documents'`
- **Empresarial:** Automático (usa `ALL_MODULE_KEYS`)

## Archivos modificados

- `prisma/seeds/modules/definitions.ts` — Nuevo módulo, eliminado radian
- `prisma/seeds/modules/actions/electronic_documents.ts` — **Nuevo archivo** con 17 permisos
- `prisma/seeds/modules/actions/sales.ts` — Eliminados 7 permisos DIAN/resoluciones
- `prisma/seeds/modules/actions/expenses.ts` — Eliminado `expenses.send_dian`
- `prisma/seeds/modules/actions/company_profile.ts` — Eliminado `company.dian.configure`
- `prisma/seeds/modules/actions/index.ts` — Reemplazado radian por electronic_documents
- `prisma/seeds/modules/dependencies.ts` — Sin dependencia para electronic_documents
- `prisma/seeds/seed-plans.ts` — Profesional usa electronic_documents
