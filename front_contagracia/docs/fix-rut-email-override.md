# Fix: Consulta RUT Sobreescribía Email Verificado

## Problema

En el flujo de registro (`AuthModal.tsx`), al consultar el RUT con el NIT en la DIAN, el email que traía la respuesta del RUT sobreescribía el email que el usuario ya había verificado con el código OTP.

## Causa

En `handleRutQuery`, la línea:

```typescript
if (data.email) setRegisterEmail(data.email);
```

No verificaba si el email ya había sido validado previamente.

## Solución

Se agregó la condición `!emailVerified`:

```typescript
if (data.email && !emailVerified) setRegisterEmail(data.email);
```

Ahora el email del RUT solo se usa si el usuario aún no ha verificado su correo.

## Archivo Modificado

- `src/modules/auth/components/AuthModal.tsx` (línea 191)
