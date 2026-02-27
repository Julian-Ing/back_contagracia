# Fix: shared-dian no disponible en runtime

**Fecha:** 2026-02-18

## Problema

`DianApiService` compilaba correctamente (TypeScript leía `index.ts`) pero en runtime
era `undefined` porque Node.js carga `index.js` (definido en `package.json → "main"`),
y ese archivo no incluía `shared-dian`.

NestJS reportaba esto como `CircularDependencyException` al llamar `container.addProvider(undefined, ...)`.

## Causa raíz

- `package.json`: `"main": "index.js"`, `"types": "index.ts"`
- `index.ts` exportaba `shared-dian` ✅
- `index.js` NO exportaba `shared-dian` ❌
- `shared-dian/src/` no tenía archivos `.js` compilados (a diferencia de `shared-tenant-context/src/`)

## Solución

1. Compilar `shared-dian` con `tsc` desde la raíz de shared-modules:
   ```bash
   npx tsc --project tsconfig.json
   ```
   Genera `dist/shared-dian/src/{dian-api.module.js, dian-api.service.js, index.js, ...}`

2. Agregar export en `index.js`:
   ```javascript
   const dianApi = require('./dist/shared-dian/src/index');
   Object.assign(module.exports, dianApi);
   ```

3. Remover `DianApiController` del barrel `shared-dian/src/index.ts`:
   - El controller compilado usaba path relativo `../../shared-auth/dist/...` que rompía
     cuando se cargaba desde `dist/shared-dian/src/` (path resolvía a `dist/shared-auth/dist/` inexistente)
   - Cada servicio tiene sus propios controllers; el controller en shared-modules era innecesario

## Cambio en DianApiService

Para evitar circular dependency con módulos globales (TenantContextModule es `@Global()`),
`DianApiService` NO inyecta `TenantContextService` en el constructor — lo recibe como
parámetro en los métodos que lo necesitan:

```typescript
// ANTES (causaba circular dependency)
constructor(private readonly tenantContext: TenantContextService) {}

// DESPUÉS
constructor() {}
async getDianToken(companyId: string, tenantContext: TenantContextService): Promise<string | null>
async syncCompany(companyId: string, data: SyncCompanyData, tenantContext: TenantContextService): Promise<SyncCompanyResponse>
```

## Cómo mantener actualizado

Cuando se modifique cualquier archivo en `shared-dian/src/`, recompilar:
```bash
cd contagracia-shared-modules
npx tsc --project tsconfig.json
```
Esto regenera `dist/shared-dian/src/`.
