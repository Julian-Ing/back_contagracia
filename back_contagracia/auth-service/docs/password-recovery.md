# Recuperación de Contraseña

## Descripción

Sistema de recuperación de contraseña mediante códigos de verificación de 6 dígitos enviados por email.

## Flujo

1. Usuario ingresa email y NIT (opcional) en el formulario de login
2. Click en "¿Olvidaste tu contraseña?"
3. Sistema valida:
   - Si hay NIT: verifica que la empresa existe y que el usuario pertenece a ese tenant
   - Verifica que el usuario existe en master
4. Se genera código de 6 dígitos y se envía por email
5. Usuario ingresa el código
6. Sistema verifica el código y devuelve un token de reset
7. Usuario ingresa nueva contraseña
8. Sistema actualiza la contraseña e invalida todas las sesiones activas

## Endpoints

### POST /api/passwords/forgot

Envía código de verificación al email.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "nit": "900123456"  // opcional
}
```

**Response (200):**
```json
{
  "message": "Si el email existe, recibirás un código de verificación",
  "expires_in": 900
}
```

**Errores:**
- `400 Bad Request`: "NIT de empresa no encontrado"
- `400 Bad Request`: "Usuario no encontrado en esta empresa"
- `400 Bad Request`: "Email no registrado"

### POST /api/passwords/verify-code

Verifica el código y devuelve token de reset.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "message": "Código verificado correctamente",
  "reset_token": "uuid-token",
  "expires_in": 1800
}
```

**Errores:**
- `400 Bad Request`: "Código inválido o expirado"
- `400 Bad Request`: "El código ha expirado. Solicita uno nuevo."

### POST /api/passwords/reset

Restablece la contraseña con el token.

**Request:**
```json
{
  "token": "uuid-token",
  "new_password": "NuevaPassword123"
}
```

**Response (200):**
```json
{
  "message": "Contraseña restablecida exitosamente. Ya puedes iniciar sesión."
}
```

**Errores:**
- `404 Not Found`: "Token de reset inválido"
- `400 Bad Request`: "Este token ya ha sido utilizado"
- `400 Bad Request`: "El token de reset ha expirado"

## Implementación Técnica

### Almacenamiento del Código

El código de 6 dígitos se almacena en el campo `token` de la tabla `password_resets` con formato:
```
{código}_{uuid}
```
Ejemplo: `549331_a1b2c3d4-e5f6-7890-abcd-ef1234567890`

Esto permite buscar por código usando `startsWith`.

### Tiempos de Expiración

- Código de verificación: 15 minutos
- Token de reset: 30 minutos

### Seguridad

- Al resetear contraseña, se invalidan todas las sesiones activas del usuario
- Los códigos/tokens anteriores se marcan como usados al generar nuevos
- Rate limiting: 3 intentos por hora en `/forgot`, 5 intentos cada 15 min en `/verify-code`

## Archivos Modificados

- `passwords.service.ts` - Lógica de negocio
- `passwords.controller.ts` - Endpoints
- `dto/forgot-password.dto.ts` - DTO con campo NIT opcional
- `dto/verify-reset-code.dto.ts` - Nuevo DTO para verificación
- `dto/index.ts` - Exportaciones
- `passwords.module.ts` - Importación de EmailModule
- `email.service.ts` - Template de email para recuperación
