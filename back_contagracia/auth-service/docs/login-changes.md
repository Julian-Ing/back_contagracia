# Cambios en Login - 2026-01-29

## Resumen
Se realizaron mejoras en el flujo de login para soportar NITs de diferentes longitudes y mejorar la experiencia de usuario.

## Cambios Realizados

### 1. Validación de NIT en Login (login.dto.ts)
**Antes:**
```typescript
@Matches(/^\d{9,10}$/, { message: 'NIT debe tener 9 o 10 dígitos' })
nit?: string;
```

**Después:**
```typescript
@IsOptional()
@IsString()
nit?: string;
```

**Razón:** El login no debe validar el formato del NIT estrictamente. Solo necesita aceptar el valor para buscarlo en la base de datos. La validación estricta solo aplica en el registro.

### 2. Verificación de Email en Login (auth.service.ts)
El sistema verifica que el usuario tenga `email_verified: true` antes de permitir el login. Esto funciona correctamente con el nuevo flujo de registro que usa OTP.

## Archivos Modificados
- `src/modules/auth/dto/login.dto.ts` - Removida validación regex del NIT
- `src/modules/auth/auth.service.ts` - Sin cambios (ya tenía la verificación de email)

## Notas
- El NIT sigue siendo opcional para permitir login de super admins
- La validación de formato de NIT (4-15 dígitos) solo se aplica en el registro de empresa
