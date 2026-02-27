# Fix Build Shared Modules

## Fecha: 2025-02-02

## Problema

Los servicios fallaban al compilar con el error:
```
Type 'DynamicModule' is not assignable to type 'Type<any> | DynamicModule'
```

Esto ocurria porque `shared-modules/node_modules` tenia `@nestjs/common@10.4.22` mientras el backend usaba `@nestjs/common@11.1.12`.

## Solucion

### 1. Corregir rutas de tsconfig.json

Los archivos `tsconfig.json` de los shared modules extendian de `../../tsconfig.json` (backend raiz) en lugar de `../tsconfig.json` (shared-modules raiz).

**Archivos corregidos:**
- `shared-common/tsconfig.json`
- `shared-cache/tsconfig.json`
- `shared-database/tsconfig.json`
- `shared-messaging/tsconfig.json`

**Cambio:**
```json
// Antes
"extends": "../../tsconfig.json"

// Despues
"extends": "../tsconfig.json"
```

### 2. Habilitar decoradores en tsconfig base

El `tsconfig.json` raiz de shared-modules no tenia habilitados los decoradores de NestJS.

**Archivo:** `tsconfig.json`

**Cambio:**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": false,
    "strictPropertyInitialization": false
  }
}
```

### 3. Agregar include/exclude a shared-common y shared-messaging

Estos modulos no tenian `include` definido, heredaban el del base que causaba conflictos.

**Archivos:**
- `shared-common/tsconfig.json`
- `shared-messaging/tsconfig.json`

**Cambio:**
```json
{
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Corregir imports de Prisma Client

Los servicios de Prisma importaban de `@prisma/client` pero los clientes se generan en:
- `@prisma/client-master`
- `@prisma/client-tenant`

**Archivos:**
- `shared-database/src/prisma-master.service.ts`
- `shared-database/src/prisma-tenant.service.ts`

**Cambio:**
```typescript
// prisma-master.service.ts
// Antes
import { PrismaClient } from '@prisma/client';
// Despues
import { PrismaClient } from '@prisma/client-master';

// prisma-tenant.service.ts
// Antes
import { PrismaClient } from '@prisma/client';
// Despues
import { PrismaClient } from '@prisma/client-tenant';
```

## Orden de Ejecucion para Build

Para evitar errores de tipos, seguir este orden:

```bash
# 1. Ir a shared-modules
cd contagracia-shared-modules

# 2. Instalar dependencias
pnpm install

# 3. Generar clientes Prisma
pnpm prisma:generate

# 4. Compilar todos los modulos
pnpm build:all

# 5. Volver al backend e instalar
cd ..
pnpm install

# 6. Ejecutar servicios
pnpm dev:auth
```

## Archivos Modificados

- `tsconfig.json`
- `shared-common/tsconfig.json`
- `shared-cache/tsconfig.json`
- `shared-database/tsconfig.json`
- `shared-messaging/tsconfig.json`
- `shared-database/src/prisma-master.service.ts`
- `shared-database/src/prisma-tenant.service.ts`
