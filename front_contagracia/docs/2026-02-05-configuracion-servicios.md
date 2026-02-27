# Configuración de URLs de Microservicios

**Fecha:** 2026-02-05

## Resumen

Corrección de URLs de microservicios y renombramiento de SETTINGS a INTEGRATIONS.

## Cambios en .env

| Variable | Antes | Después |
|----------|-------|---------|
| NEXT_PUBLIC_QUOTE_SERVICE_URL | localhost:3016 | localhost:3007 |
| NEXT_PUBLIC_SETTINGS_SERVICE_URL | localhost:3014 | (eliminada) |
| NEXT_PUBLIC_INTEGRATIONS_SERVICE_URL | (nueva) | localhost:3014 |
| NEXT_PUBLIC_ELECTRONIC_DOCS_SERVICE_URL | (nueva) | localhost:3016 |

## Cambios en api.config.ts

### API_CONFIG
- `QUOTE`: Puerto cambiado de 3016 a 3007
- `SETTINGS` renombrado a `INTEGRATIONS`
- Agregado `ELECTRONIC_DOCS` en puerto 3016

### SERVICE_PORTS
- `QUOTE`: 3016 → 3007
- `SETTINGS` → `INTEGRATIONS`: 3014
- Agregado `ELECTRONIC_DOCS`: 3016

## Cambios en apiClient.ts

- `settingsClient` renombrado a `integrationsClient`
- Agregado `electronicDocsClient`

## Mapa de Puertos Final

```
3001 - AUTH
3002 - ADMIN
3003 - COMPANY
3004 - USERS
3005 - INVOICING
3006 - INVENTORY
3007 - QUOTE
3008 - PURCHASES
3009 - TAX
3010 - ACCOUNTING
3011 - CRM
3012 - HR
3013 - REPORTS
3014 - INTEGRATIONS
3015 - NOTIFICATIONS
3016 - ELECTRONIC_DOCS
```

## Archivos Modificados

- `.env`
- `src/config/api.config.ts`
- `src/shared/services/api/apiClient.ts`
