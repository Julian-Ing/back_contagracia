# Migración dianClient al backend

**Fecha:** 2026-02-17

## Resumen

Se migró la consulta de RUT de la DIAN del frontend al backend para no exponer el token de autenticación en variables de entorno públicas.

## Cambios

- `src/shared/services/api/dianClient.ts` — Ya no llama directamente al API DIAN. Ahora usa `electronicDocsClient` para llamar al endpoint del backend `POST /dian/query-rut`
- `.env` — Se eliminaron `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_API_TOKEN_FOR_RUT`

## Flujo

1. Frontend llama `POST electronic-documents-service/dian/query-rut` con `{ identification_number }`
2. Backend (`DianApiController` en shared-dian) consulta el API DIAN con el token seguro
3. Retorna el resultado al frontend
