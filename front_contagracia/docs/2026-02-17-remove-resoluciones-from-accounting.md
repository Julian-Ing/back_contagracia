# Remover Resoluciones del Panel de Contabilidad

## Resumen

Se elimino la tarjeta de "Resoluciones" del panel de contabilidad (/dashboard/accounting) porque las resoluciones de facturacion DIAN son del modulo de ventas/facturacion, no de contabilidad.

## Archivo modificado

- `src/app/dashboard/accounting/page.tsx` — Se elimino el objeto de Resoluciones del array `features` (title: 'Resoluciones', permission: 'sales.resolutions.view', href: '/dashboard/accounting/resolutions')

## Nota

La pagina /dashboard/accounting/resolutions sigue existiendo como placeholder pero ya no aparece en el panel de contabilidad. Si se necesita, debe moverse al modulo de ventas/facturacion.
