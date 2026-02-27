# Configuración de Servicios y Redis Cloud

**Fecha:** 2026-02-05

## Resumen

Corrección de puertos de microservicios y migración de Redis local a Redis Cloud.

## Cambios en Puertos de Microservicios

Se corrigieron los puertos en los archivos `.env` de los siguientes servicios:

| Servicio | Puerto Anterior | Puerto Correcto |
|----------|-----------------|-----------------|
| inventory-service | 3007 | 3006 |
| quote-service | 3016 | 3007 |
| integrations-service | 3006 | 3014 |
| electronic-documents-service | 3017 | 3016 |

### Mapa de Puertos Final

```
3001 - auth-service
3002 - admin-service
3003 - company-service
3004 - users-service
3005 - invoicing-service
3006 - inventory-service
3007 - quote-service
3008 - purchase-service
3009 - tax-service
3010 - accounting-service
3011 - crm-service
3012 - hr-service
3013 - reports-service
3014 - integrations-service
3015 - notification-service
3016 - electronic-documents-service
```

## Migración a Redis Cloud

### Antes
- Redis local en Docker: `redis://localhost:6379`

### Después
- Redis Cloud (Redis Labs): `redis://default:***@redis-12486.c61.us-east-1-3.ec2.cloud.redislabs.com:12486`

### Servicios Actualizados

Se actualizó `REDIS_URL` en:
- `auth-service/.env`
- `users-service/.env`
- `admin-service/.env`
- `contagracia-shared-modules/.env`

### Cambio en shared-cache

Se modificó `shared-cache/src/cache.module.ts` para usar `REDIS_URL` en lugar de variables separadas `REDIS_HOST` y `REDIS_PORT`.

**Antes:**
```typescript
host: process.env.REDIS_HOST || 'localhost',
port: parseInt(process.env.REDIS_PORT || '6379'),
```

**Después:**
```typescript
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const config = parseRedisUrl(redisUrl);
// Usa config.host, config.port, config.username, config.password
```

## Archivos Modificados

- `inventory-service/.env`
- `quote-service/.env`
- `integrations-service/.env`
- `electronic-documents-service/.env`
- `auth-service/.env`
- `users-service/.env`
- `admin-service/.env`
- `contagracia-shared-modules/.env`
- `contagracia-shared-modules/shared-cache/src/cache.module.ts`
