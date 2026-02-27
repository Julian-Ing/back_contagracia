# Persistencia de Sesión - Fix Rehidratación Zustand

## Problema

Al refrescar la página (F5), el usuario era redirigido al landing (`/`) perdiendo la sesión, a pesar de que los tokens estaban guardados en `localStorage`.

## Causa Raíz

Zustand con el middleware `persist` rehidrata el estado desde `localStorage` de forma **asíncrona**. En el primer render (SSR/CSR inicial), el store tiene los valores por defecto (`isAuthenticated: false`). Los layouts de `/dashboard` y `/admin` detectaban esto y redirigían a `/` **antes** de que la rehidratación terminara.

## Solución

### 1. Hook `useAuthHydrated` (`stores/authStore.ts`)

Se creó un hook que retorna `true` solo cuando el store terminó de cargar desde `localStorage`:

```typescript
export const useAuthHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;
    if (persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
};
```

- `useState(false)` evita acceder a `persist` durante SSR.
- `useEffect` solo corre en el cliente, donde `persist` está disponible.

### 2. Layouts protegidos (`dashboard/layout.tsx`, `admin/layout.tsx`)

Ahora esperan la rehidratación antes de decidir si redirigir:

```typescript
const hydrated = useAuthHydrated();

useEffect(() => {
  if (hydrated && !isAuthenticated) {
    router.push('/');
  }
}, [hydrated, isAuthenticated, router]);

if (!hydrated || !isAuthenticated) {
  return <LoadingSpinner />;
}
```

## Archivos Modificados

- `src/modules/auth/stores/authStore.ts` - Nuevo hook `useAuthHydrated`
- `src/modules/auth/index.ts` - Exportación del hook
- `src/app/dashboard/layout.tsx` - Espera rehidratación
- `src/app/admin/layout.tsx` - Espera rehidratación
