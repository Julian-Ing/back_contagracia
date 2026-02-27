# Rutas Internas sin Prefijo API

## Descripcion

Las rutas internas (`_internal/*`) se excluyen del prefijo global `/api` para mantener URLs limpias.

## Configuracion

```typescript
// main.ts
app.setGlobalPrefix('api', {
  exclude: ['_internal/puc', '_internal/accounting-config', '_internal/full'],
});
```

## Rutas Internas

| Ruta | Descripcion |
|------|-------------|
| `/_internal/puc` | Plan Unico de Cuentas |
| `/_internal/accounting-config` | Configuraciones contables |
| `/_internal/full` | Datos completos |

## Uso

Estas rutas son para consumo interno (frontend dev, scripts) y no requieren autenticacion.
