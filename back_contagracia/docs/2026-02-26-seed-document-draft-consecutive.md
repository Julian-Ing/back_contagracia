# Seed: consecutivo document_draft + evento realtime modules_updated

**Fecha:** 2026-02-26

## Cambio 1 — Consecutivo document_draft

### Contexto

Se necesitaba un tipo de consecutivo `document_draft` para borradores de documentos. Sin este seed, los borradores no podian obtener un numero consecutivo al crearse.

### Solucion

Agregado el tipo de consecutivo `document_draft` al seed de la base de datos master, y luego ejecutado el seed en todos los tenants existentes.

### Post-cambio

```bash
cd contagracia-shared-modules
npx prisma generate --schema=prisma/schema-tenant.prisma
npx ts-node prisma/seeds/seed.ts           # master
npx ts-node prisma/scripts/seed-all-tenants.ts --force  # tenants
```

---

## Cambio 2 — RealtimeEvent: company:modules_updated

### Contexto

Complemento backend del nuevo `CompanyModulesProvider` en frontend. Cuando los modulos de una empresa cambian (ej: cambio de plan), el backend debe emitir el evento para que el frontend actualice sin reload.

### Solucion

Agregado `'company:modules_updated'` al tipo `RealtimeEvent` en el backend, permitiendo que el gateway de WebSocket emita este evento a los clientes conectados del tenant.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| Seeds de consecutivos (shared-modules) | Agregado tipo `document_draft` |
| RealtimeEvent type (backend) | Agregado `'company:modules_updated'` al enum/type de eventos |
