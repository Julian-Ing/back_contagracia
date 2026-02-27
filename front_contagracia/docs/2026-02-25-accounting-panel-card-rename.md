# Renombrar card de Cierre Contable a Períodos Contables

**Fecha:** 2026-02-25

## Cambio

En el panel principal de contabilidad (`/dashboard/accounting`), la card que llevaba a la página de períodos decía "Cierre Contable — Cierra el período seleccionando un rango de fechas. Cerrar período", lo cual era confuso ya que la página gestiona períodos en general (crear, cerrar, reabrir, importar saldos).

Se cambió a:
- **Título**: "Períodos Contables"
- **Descripción**: "Gestión de períodos contables."
- **CTA**: "Gestionar"

## Archivo modificado

- `src/app/dashboard/accounting/page.tsx`
