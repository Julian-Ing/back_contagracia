# Configuracion Prisma Paths en tsconfig

## Descripcion

Se agregaron paths para los clientes Prisma en `tsconfig.json` para resolver correctamente las importaciones.

## Cambios

```json
{
  "compilerOptions": {
    "paths": {
      "@prisma/client-master": ["../contagracia-shared-modules/node_modules/@prisma/client-master"],
      "@prisma/client-tenant": ["../contagracia-shared-modules/node_modules/@prisma/client-tenant"]
    }
  }
}
```

## Motivo

Los clientes Prisma se generan en `contagracia-shared-modules` y necesitan ser referenciados correctamente desde otros servicios.
