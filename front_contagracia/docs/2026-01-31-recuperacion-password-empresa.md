# Recuperación de Contraseña para Usuarios de Empresa

**Fecha:** 2026-01-31

## Resumen

Se corrigió el flujo de recuperación de contraseña ("¿Se te olvidó la contraseña antigua?") para usuarios logueados en una empresa, pasando el NIT de la empresa al backend.

## Problema

Cuando un usuario de empresa hacía clic en "¿Se te olvidó la contraseña antigua?" desde el modal de cambio de contraseña, el sistema mostraba "Email no registrado" porque:

1. El frontend solo enviaba el email, sin el NIT
2. El backend buscaba el email en la tabla `User` del master (admins del sistema)
3. El usuario de empresa no existe en `User`, sino en `TenantUser` del tenant

## Solución

### `shared/components/layout/Header.tsx`

**Antes:**
```typescript
const handleForgotPassword = async () => {
  if (!user?.email) return;
  await forgotPassword({ email: user.email });
  setPasswordStep('forgot_sent');
};
```

**Ahora:**
```typescript
const handleForgotPassword = async () => {
  if (!user?.email) return;
  // Pasar NIT si el usuario está logueado en una empresa
  await forgotPassword({ email: user.email, nit: company?.nit });
  setPasswordStep('forgot_sent');
};
```

## Flujo de Recuperación

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario logueado hace clic en                              │
│  "¿Se te olvidó la contraseña antigua?"                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Frontend envía:      │
                │  - email: user.email  │
                │  - nit: company?.nit  │
                └───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Backend recibe NIT   │
                │  → Busca Company      │
                │  → Conecta al Tenant  │
                │  → Busca TenantUser   │
                └───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Envía código de      │
                │  recuperación al      │
                │  email del usuario    │
                └───────────────────────┘
```

## Dependencias

El campo `company.nit` viene del auth store después del login. El backend debe retornar `nit` (no `tax_id`) en la respuesta de login.

## Archivos Relacionados

- `modules/auth/services/authService.ts`: Define `ForgotPasswordData` con campo `nit` opcional
- `modules/auth/stores/authStore.ts`: Almacena `company` con sus datos incluyendo `nit`
