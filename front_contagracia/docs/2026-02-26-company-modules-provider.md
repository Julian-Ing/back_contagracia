# CompanyModulesProvider — contexto centralizado de modulos

**Fecha:** 2026-02-26

## Problema

`useCompanyModules` usaba estado local por componente: cada componente que llamaba al hook disparaba su propio fetch a `/company-modules` y mantenía su propio `loading`/`modules` state. Esto causaba:

1. **Race condition**: `hasModule()` retornaba `false` durante la carga, y varios componentes tomaban decisiones (ocultar UI, no cargar datos) antes de que la respuesta llegara.
2. **Requests duplicados**: N componentes montados = N llamadas al mismo endpoint.

## Solucion

Mismo patron que `CompanySettingsProvider`: un React context provider que hace un solo fetch al montar y comparte el resultado via contexto.

### Archivos creados

| Archivo | Descripcion |
|---------|-------------|
| `src/shared/providers/CompanyModulesProvider.tsx` | Context provider que fetch modulos una vez y expone `modules`, `loading`, `hasModule()` via contexto |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/shared/hooks/useCompanyModules.ts` | Reescrito: ahora lee del contexto (`CompanyModulesProvider`) en vez de estado local + fetch propio. `hasModule()` es estable despues del primer fetch global |
| `src/app/dashboard/layout.tsx` | Montado `CompanyModulesProvider` dentro de `RealtimeProvider` (mismo nivel que `CompanySettingsProvider`) |
| `src/shared/providers/RealtimeProvider.tsx` | Agregado `'company:modules_updated'` al tipo `RealtimeEvent` + socket listener para notificar subscribers cuando los modulos cambian |

## Orden de providers en layout

```
RealtimeProvider              <- conecta WebSocket
  CompanySettingsProvider     <- usa useRealtime() para display_decimals
  CompanyModulesProvider      <- usa useRealtime() para modules_updated
    children
```

## Uso

```typescript
// En cualquier componente dentro de dashboard/layout
const { hasModule, loading } = useCompanyModules();

// hasModule() retorna false SOLO si el modulo realmente no existe
// (no por race condition de carga — loading es compartido)
if (hasModule('cost_centers')) {
  // mostrar selector de centro de costos
}
```

## Evento realtime

Cuando el backend emite `'company:modules_updated'` via WebSocket (ej: al cambiar el plan de la empresa), `CompanyModulesProvider` refresca los modulos automaticamente sin reload.
