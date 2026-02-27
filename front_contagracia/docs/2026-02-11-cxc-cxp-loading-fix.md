# Fix: Loading sin reload en CxC y CxP

**Fecha:** 2026-02-11

## Archivos modificados

- `src/app/dashboard/accounts-receivable/page.tsx`
- `src/app/dashboard/accounts-payable/page.tsx`

## Problema

Al presionar "Buscar", toda la pagina parecia recargarse. El contenido (cards de resumen, tabla, paginacion) se desmontaba completamente durante el loading y se remontaba despues, causando un flash visual identico a un page reload.

La causa era el patron de renderizado condicional:
```tsx
{isLoading && <Spinner />}
{!isLoading && !dataError && <TablaCompleta />}
```

Cuando `isLoading` pasaba a `true`, `<TablaCompleta />` se desmontaba del DOM y solo se mostraba el spinner. Al terminar la carga, todo se remontaba desde cero.

## Solucion

1. **Removido** el spinner global que reemplazaba el contenido
2. **Removido** `!isLoading` de las condiciones de renderizado de las tabs
3. **Agregado** overlay de loading dentro de cada `<CardContent>`:

```tsx
<CardContent className="relative">
  {isLoading && (
    <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-md">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )}
  {/* tabla permanece montada */}
</CardContent>
```

El contenido siempre permanece en el DOM. Durante loading se muestra un overlay semi-transparente con spinner encima, sin desmontar nada.

## Cambio adicional

Agregado `type="button"` a los 4 botones "Buscar" (2 por pagina) para prevenir submit implicito de formularios HTML.
