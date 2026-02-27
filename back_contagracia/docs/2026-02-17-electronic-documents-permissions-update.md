# Permisos electronic_documents — Actualización configure → view

**Fecha:** 2026-02-17

## Cambios

### Permiso renombrado
- `electronic_documents.configure` eliminado
- `electronic_documents.view` agregado — permiso general para acceder al módulo

### Workspace y dev:all
- `accounting-service` desactivado en `pnpm-workspace.yaml` y `package.json` (dev:all)
- `electronic-documents-service` activado (puerto 3016)

### Permisos agregados (2026-02-17 #2)
- `electronic_documents.certificate.load` — Cargar certificado digital
- `electronic_documents.invoice_software.manage` — Configurar software facturación
- `electronic_documents.payroll_software.manage` — Configurar software nómina
- `electronic_documents.invoice_environment.manage` — Configurar ambiente facturación
- `electronic_documents.payroll_environment.manage` — Configurar ambiente nómina

Total: 21 permisos en el módulo electronic_documents.

## Archivos modificados

- `prisma/seeds/modules/actions/electronic_documents.ts` — configure → view, +5 permisos nuevos
- `package.json` — dev:all usa electronic-documents-service
- `pnpm-workspace.yaml` — accounting-service comentado, electronic-documents-service activo
