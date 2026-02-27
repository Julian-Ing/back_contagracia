# Fix: Owner Permissions Bypass

## Fecha: 2026-02-02

## Problema

Los usuarios con rol `owner` no recibían todas las acciones de sus módulos en el JWT. Solo los usuarios con rol `admin` tenían el bypass de permisos.

## Solución

En `src/modules/auth/auth.service.ts`, función `resolveUserPermissions()`:

```typescript
// ANTES - solo admin tenía bypass
if (tenantUser.role.role_key === 'admin') {
  return allPlanActions;
}

// DESPUÉS - owner y admin tienen bypass
if (tenantUser.role.role_key === 'owner' || tenantUser.role.role_key === 'admin') {
  return allPlanActions;
}
```

## Comportamiento

- **Owner/Admin**: Reciben TODAS las acciones de los módulos de su plan
- **Otros roles**: Reciben solo las acciones de su rol + overrides personales

## Archivos Modificados

- `src/modules/auth/auth.service.ts` (línea ~67)

## Notas

Los usuarios deben cerrar sesión y volver a iniciar sesión para que el JWT se regenere con los permisos correctos.
