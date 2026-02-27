# Modal de Cambiar Contrasena

## Descripcion

Modal integrado en el Header que permite a los usuarios cambiar su contrasena desde el dropdown del usuario.

## Ubicacion

- **Componente**: `src/shared/components/layout/Header.tsx`
- **Servicio**: `src/modules/auth/services/authService.ts`

## Flujo de Usuario

### Opcion 1: Cambio con contrasena actual

1. Click en "Cambiar Contrasena" en el dropdown del usuario
2. Ingresar contrasena actual
3. Ingresar nueva contrasena (minimo 8 caracteres)
4. Confirmar nueva contrasena
5. Click en "Cambiar Contrasena"

### Opcion 2: Olvido de contrasena

1. Click en "Cambiar Contrasena" en el dropdown del usuario
2. Click en "Se te olvido la contrasena antigua?"
3. Se envia codigo de 6 digitos al email del usuario
4. Ingresar el codigo recibido
5. Ingresar nueva contrasena
6. Confirmar nueva contrasena
7. Click en "Restablecer Contrasena"

## Estados del Modal

| Estado | Descripcion |
|--------|-------------|
| `change` | Formulario inicial con contrasena actual |
| `forgot_sent` | Codigo enviado, esperando verificacion |
| `reset` | Codigo verificado, ingresar nueva contrasena |
| `success` | Contrasena cambiada exitosamente |

## Endpoints Utilizados

- `POST /passwords/change` - Cambiar con contrasena actual
- `POST /passwords/forgot` - Enviar codigo de recuperacion
- `POST /passwords/verify-code` - Verificar codigo
- `POST /passwords/reset` - Restablecer con token

## Validaciones

- Contrasena minimo 8 caracteres
- Nueva contrasena debe coincidir con confirmacion
- Codigo de verificacion debe ser 6 digitos

## Notas

- El codigo de verificacion expira en 15 minutos
- El token de reset expira en 30 minutos
- Al cambiar contrasena se invalidan todas las sesiones activas (por seguridad)
