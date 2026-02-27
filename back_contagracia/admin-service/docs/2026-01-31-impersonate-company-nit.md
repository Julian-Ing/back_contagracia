# Impersonación de Empresas - Campo NIT

**Fecha:** 2026-01-31

## Resumen

Se actualizó el endpoint de impersonación de empresas para retornar `nit` en lugar de `tax_id`, manteniendo consistencia con el frontend y el auth-service.

## Cambios Realizados

### `companies/companies.service.ts`

#### Método `impersonate`

**Antes:**
```typescript
company: {
  id: company.id,
  name: company.company_name,
  tax_id: company.nit || '',
},
```

**Ahora:**
```typescript
company: {
  id: company.id,
  name: company.company_name,
  nit: company.nit || '',
},
```

#### Tipo de Owner

Se corrigió el tipo explícito de la variable `owner` para evitar errores de TypeScript:

```typescript
let owner: {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: Date;
  is_active: boolean;
} | null = null;
```

## Consistencia de Nomenclatura

| Servicio       | Campo   | Descripción                |
|----------------|---------|----------------------------|
| auth-service   | `nit`   | Login response             |
| admin-service  | `nit`   | Impersonate response       |
| Frontend       | `nit`   | Company interface          |

## Endpoint Afectado

```
POST /api/admin/companies/:id/impersonate
```

### Response

```json
{
  "access_token": "...",
  "refresh_token": null,
  "user_type": "company_user",
  "user": {
    "id": "...",
    "email": "owner@empresa.com",
    "full_name": "Owner Name"
  },
  "company": {
    "id": "...",
    "name": "Empresa S.A.S.",
    "nit": "900123456"
  },
  "subscription": {...},
  "modules": [...],
  "role": "owner",
  "impersonated": true
}
```
