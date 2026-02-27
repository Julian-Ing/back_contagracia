# Verificacion de Email con OTP

## Descripcion

Sistema de verificacion de email pre-registro usando codigo OTP de 6 digitos. Permite validar que el email pertenece al usuario antes de crear la cuenta y el tenant.

## Flujo de Verificacion

1. Usuario ingresa su email en el formulario de registro
2. Frontend llama `POST /auth/send-verification-code`
3. Backend genera codigo de 6 digitos, lo guarda en `email_verifications` y envia por SMTP
4. Usuario recibe el codigo en su correo
5. Usuario ingresa el codigo en el formulario
6. Frontend llama `POST /auth/verify-code`
7. Si es valido, backend retorna `registration_token` (valido por 30 minutos)
8. Frontend puede proceder con el registro completo enviando el `registration_token`

## Endpoints

### POST /auth/send-verification-code

Envia un codigo de verificacion de 6 digitos al email.

**Request:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Response (200):**
```json
{
  "message": "Codigo de verificacion enviado",
  "email": "usuario@ejemplo.com",
  "expires_in": 900
}
```

**Errores:**
- `409 Conflict`: El email ya esta registrado
- `500 Internal Server Error`: El servicio de email no esta configurado

**Rate Limit:** 3 intentos por 5 minutos

### POST /auth/verify-code

Verifica el codigo OTP ingresado por el usuario.

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
  "message": "Email verificado correctamente",
  "email": "usuario@ejemplo.com",
  "registration_token": "uuid-token-para-registro",
  "expires_in": 1800
}
```

**Errores:**
- `400 Bad Request`: Codigo invalido o expirado

**Rate Limit:** 5 intentos por 5 minutos

## Configuracion SMTP

La configuracion SMTP se lee de las tablas `integrations` e `integration_keys` en la base de datos master.

### Integracion SMTP

| Key | Descripcion | Secret |
|---|---|---|
| `host` | Host del servidor SMTP | No |
| `port` | Puerto (587 por defecto) | No |
| `secure` | true/false para TLS | No |
| `user` | Usuario SMTP | No |
| `password` | Contraseña SMTP | Si |
| `from_email` | Email remitente | No |
| `from_name` | Nombre remitente | No |

### Activar SMTP

1. Configurar las keys en la tabla `integration_keys` con los valores correctos
2. Activar la integracion: `UPDATE integrations SET is_active = true WHERE code = 'smtp'`

## Archivos Relacionados

- `auth-service/src/modules/email/email.service.ts` - Servicio de email con nodemailer
- `auth-service/src/modules/email/email.module.ts` - Modulo de email
- `auth-service/src/modules/auth/auth.service.ts` - Metodos sendVerificationCode y verifyCode
- `auth-service/src/modules/auth/auth.controller.ts` - Endpoints
- `auth-service/src/modules/auth/dto/send-verification-code.dto.ts` - DTO envio
- `auth-service/src/modules/auth/dto/verify-code.dto.ts` - DTO verificacion

## Notas

- El codigo de verificacion expira en 15 minutos
- El token de registro expira en 30 minutos
- Los codigos anteriores se invalidan cuando se genera uno nuevo para el mismo email
- El servicio de email lee la configuracion de la BD cada vez (cachea el transporter si no cambio)
