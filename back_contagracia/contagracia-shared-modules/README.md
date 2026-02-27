# Contagracia Shared Modules

Módulos compartidos para todos los microservicios de Contagracia.

## 📦 Módulos

1. **@contagracia/shared-database** - Prisma Master + Tenant
2. **@contagracia/shared-cache** - Redis
3. **@contagracia/shared-auth** - JWT Guards + Decorators
4. **@contagracia/shared-audit** - Audit Log
5. **@contagracia/shared-common** - Filters, Interceptors, Pipes
6. **@contagracia/shared-messaging** - RabbitMQ Events

## 🚀 Instalación

### En un microservicio

```bash
pnpm add @contagracia/shared-database
pnpm add @contagracia/shared-cache
pnpm add @contagracia/shared-auth
pnpm add @contagracia/shared-audit
pnpm add @contagracia/shared-common
pnpm add @contagracia/shared-messaging
```

## 🔧 Desarrollo

### Orden de Ejecucion (IMPORTANTE)

Para evitar errores de tipos entre versiones de @nestjs/common, seguir este orden:

```bash
# 1. Instalar dependencias
pnpm install

# 2. Generar clientes Prisma (OBLIGATORIO antes de build)
pnpm prisma:generate

# 3. Compilar todos los modulos
pnpm build:all

# 4. Volver al backend e instalar
cd ..
pnpm install

# 5. Ejecutar servicios
pnpm dev:auth
```

### Build de todos los módulos

```bash
pnpm build:all
```

### Build de un módulo específico

```bash
pnpm build:database
pnpm build:cache
pnpm build:auth
```

## 📤 Publicar a npm privado

### Configurar npm registry privado

```bash
# Opción 1: Usar GitHub Packages
npm config set @contagracia:registry https://npm.pkg.github.com

# Opción 2: Usar npm privado
npm config set @contagracia:registry https://registry.npmjs.org/
```

### Publicar todos los módulos

```bash
pnpm publish:all
```

## 📝 Uso en Microservicios

```typescript
// app.module.ts
import { DatabaseModule } from '@contagracia/shared-database';
import { CacheModule } from '@contagracia/shared-cache';
import { AuthModule } from '@contagracia/shared-auth';

@Module({
  imports: [DatabaseModule, CacheModule, AuthModule],
})
export class AppModule {}
```

## 🔄 Versionado

Seguimos [Semantic Versioning](https://semver.org/):
- **MAJOR**: Cambios incompatibles
- **MINOR**: Nueva funcionalidad compatible
- **PATCH**: Bug fixes

---

**Versión**: 1.0.0  
**Licencia**: Private
