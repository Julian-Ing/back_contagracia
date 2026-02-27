# Realtime: display_decimals en tiempo real (frontend)

## Contexto

Complemento frontend del realtime de `display_decimals`. Cuando el backend emite `'company:settings_updated'` via WebSocket, el frontend actualiza `displayDecimals` automaticamente sin refetch.

## Cambios

### shared/providers/RealtimeProvider.tsx

- Nuevo tipo en `RealtimeEvent`: `'company:settings_updated'`
- Nuevo `socket.on('company:settings_updated', ...)` que notifica subscribers

### shared/providers/CompanySettingsProvider.tsx

- Importa `useRealtime` de `RealtimeProvider`
- Se subscribe a `'company:settings_updated'`
- Al recibir: actualiza `displayDecimalsState` con el valor del payload, sin hacer refetch
- Validacion: clamp entre 0 y 4

## Orden de providers en layout

```
RealtimeProvider          <- conecta WebSocket
  CompanySettingsProvider  <- usa useRealtime() para subscribirse
    children
```

`RealtimeProvider` envuelve a `CompanySettingsProvider` en `dashboard/layout.tsx`, por lo que `useRealtime()` funciona correctamente.

## Componentes que se actualizan automaticamente

Al cambiar `displayDecimals` en el contexto, todos los componentes que lo consumen se re-renderizan:

- `NumericInput` — lee `CompanySettingsContext.displayDecimals` como `maxDecimals`
- `FormattedNumber` — lee `CompanySettingsContext.displayDecimals` como `decimals`

## Verificacion

1. Abrir app en 2 pestanas con el mismo tenant
2. En pestana A, cambiar decimales en perfil de empresa
3. Pestana B debe actualizar los decimales automaticamente
4. Verificar en console del browser: `[Realtime] company:settings_updated`

## Archivos

| Archivo | Cambio |
|---------|--------|
| `shared/providers/RealtimeProvider.tsx` | Nuevo evento + socket.on |
| `shared/providers/CompanySettingsProvider.tsx` | Subscribe al evento, actualizar state |
