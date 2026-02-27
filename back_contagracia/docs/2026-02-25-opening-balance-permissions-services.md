# Permisos de saldos iniciales y activacion de servicios

**Fecha:** 2026-02-25

## Cambios

### Permisos de Saldos Iniciales
- **Archivo:** `contagracia-shared-modules/prisma/seeds/modules/actions/accounting.ts`
- `accounting.opening_balance.import` - Importar Saldos Iniciales
- `accounting.opening_balance.reverse` - Reversar Saldos Iniciales

### Activacion de servicios
- **Archivo:** `pnpm-workspace.yaml`
- Activados: `media-service`, `inventory-service`, `invoicing-service`

### dev:all actualizado
- **Archivo:** `package.json`
- Script `dev:all` incluye los 3 nuevos servicios
