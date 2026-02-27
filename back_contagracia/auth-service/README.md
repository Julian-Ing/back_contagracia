# Auth Service - Contagracia

Microservicio de autenticación y autorización centralizada para la plataforma Contagracia.

## Descripción

Este servicio maneja toda la autenticación, autorización, gestión de usuarios, sesiones y permisos del sistema multi-tenant.

## Stack Tecnológico

- **Framework**: NestJS
- **Base de Datos**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Message Broker**: RabbitMQ
- **Autenticación**: JWT (Access + Refresh tokens)

## Módulos

| Módulo | Descripción |
|--------|-------------|
| `auth` | Login, logout, registro, verificación de email, refresh tokens |
| `users` | Gestión de perfiles y usuarios de compañía |
| `sessions` | Gestión de sesiones activas |
| `passwords` | Cambio y recuperación de contraseñas |
| `permissions` | Control de permisos granulares |
| `companies` | Listado de empresas del usuario |

## Endpoints

### Auth (`/auth`)

| Método | Endpoint | Descripción | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| POST | `/auth/register` | Registrar usuario en empresa existente | No | 3/hora |
| POST | `/auth/register-company` | Registrar empresa + admin + tenant DB | No | 3/hora |
| POST | `/auth/verify-email` | Verificar email con token | No | - |
| POST | `/auth/login` | Login (NIT + email + password) | No | 5/15min |
| POST | `/auth/refresh` | Refrescar access token | Sí | 10/min |
| POST | `/auth/logout` | Cerrar sesión actual | Sí | - |
| POST | `/auth/logout-all` | Cerrar todas las sesiones | Sí | - |
| POST | `/auth/switch-company` | Cambiar empresa activa | Sí | - |

### Users (`/users`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Obtener perfil propio | Sí |
| PATCH | `/users/me` | Actualizar perfil propio | Sí |
| GET | `/users/roles` | Listar roles disponibles | Sí |
| GET | `/users/company/:company_id` | Listar usuarios de compañía | Sí |
| GET | `/users/company/:company_id/:user_id` | Obtener usuario específico | Sí |
| POST | `/users/company/:company_id` | Crear usuario (admin) | Sí |
| PATCH | `/users/company/:company_id/:user_id` | Actualizar usuario (admin) | Sí |
| DELETE | `/users/company/:company_id/:user_id` | Desactivar usuario (admin) | Sí |

### Sessions (`/sessions`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/sessions` | Listar sesiones activas | Sí |
| DELETE | `/sessions/:session_id` | Revocar sesión específica | Sí |
| DELETE | `/sessions` | Revocar todas excepto actual | Sí |

### Passwords (`/passwords`)

| Método | Endpoint | Descripción | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| POST | `/passwords/change` | Cambiar contraseña actual | Sí | - |
| POST | `/passwords/forgot` | Solicitar reset de contraseña | No | 3/hora |
| POST | `/passwords/reset` | Restablecer con token | No | - |

### Permissions (`/permissions`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/permissions/my-permissions` | Obtener permisos del usuario | Sí |
| POST | `/permissions/check` | Verificar permiso específico | Sí |
| POST | `/permissions/grant` | Otorgar permiso (admin) | Sí |
| DELETE | `/permissions/revoke/:permission_id` | Revocar permiso (admin) | Sí |
| GET | `/permissions/modules` | Listar módulos habilitados | Sí |

### Companies (`/companies`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/companies/my-companies` | Listar empresas del usuario | Sí |

## Configuración

### Variables de Entorno

```env
# Base de datos
DATABASE_MASTER_URL=postgresql://user:pass@localhost:5432/contagracia_master

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@localhost:5672

# Servidor
PORT=3001
NODE_ENV=development
```

## Instalación

```bash
# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm prisma generate --schema=../contagracia-shared-modules/prisma/schema-master.prisma

# Ejecutar migraciones
pnpm prisma migrate deploy --schema=../contagracia-shared-modules/prisma/schema-master.prisma
```

## Ejecución

```bash
# Desarrollo (watch mode)
pnpm run start:dev

# Producción
pnpm run start:prod
```

## Documentación API

La documentación Swagger está disponible en:
```
http://localhost:3001/api/docs
```

## Seguridad

### Autenticación
- JWT con firma HMAC (1 hora de expiración)
- Refresh tokens rotativos (7 días, one-time use)
- Sesiones persistidas en base de datos

### Rate Limiting
- Login: 5 intentos / 15 minutos
- Registro: 3 intentos / hora
- Forgot Password: 3 intentos / hora

### Permisos
- Sistema de roles jerárquicos (admin=100, manager=50, user=0)
- Permisos granulares por acción
- Overrides por usuario
- Cache de permisos en Redis (15 min TTL)

## Arquitectura

```
src/
├── common/
│   ├── decorators/
│   │   ├── audit.decorator.ts
│   │   └── rate-limit.decorator.ts
│   ├── guards/
│   │   └── rate-limit.guard.ts
│   └── interceptors/
│       └── audit-context.interceptor.ts
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   ├── interfaces/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/
│   │   ├── dto/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── sessions/
│   ├── passwords/
│   ├── permissions/
│   ├── companies/
│   ├── prisma/
│   ├── redis/
│   ├── rabbitmq/
│   ├── dian/
│   └── tenant/
├── app.module.ts
└── main.ts
```

## Eventos RabbitMQ

El servicio emite los siguientes eventos:

| Evento | Descripción |
|--------|-------------|
| `email.verification.send` | Solicitud de envío de email de verificación |
| `email.password_reset.send` | Solicitud de envío de email de reset |
| `email.password_changed` | Notificación de cambio de contraseña |
| `email.login_alert` | Alerta de nuevo login |

## Testing

```bash
# Tests unitarios
pnpm run test

# Tests e2e
pnpm run test:e2e

# Coverage
pnpm run test:cov
```
