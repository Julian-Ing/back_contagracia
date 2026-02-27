# AccountSelect: creación integrada + Mejoras en Terceros

**Fecha**: 2026-02-16

## Cambios

### 1. AccountSelect — Modal de creación integrado

**Archivo**: `src/shared/components/ui/account-select.tsx`

Se integró `AccountForm` + `Dialog` directamente dentro del componente `AccountSelect`, de modo que el botón **"Nueva cuenta"** funcione en cualquier lugar donde se use el componente sin necesidad de cableado externo (`onCreateClick`).

**Comportamiento**:
- Si el consumidor pasa `onCreateClick`, se usa ese callback (backwards compatible).
- Si no pasa `onCreateClick`, se abre un modal interno con `AccountForm` en `mode="create"`.
- Al crear una cuenta exitosamente, se auto-selecciona en el select y se refresca la lista de opciones.
- El `AccountForm` soporta creación recursiva de padres (stack).
- Se renderiza condicionalmente (`{createModalOpen && <Dialog>...}`) para garantizar estado limpio cada vez.

**Prop `clearable`**: Se agregó la prop `clearable` (default `true`) para permitir controlar si el botón de limpiar (X) aparece. Se usa `clearable={false}` en account-mapping.

**Consumidores que ahora funcionan sin cambios**:
- `TaxFormModal.tsx` (5 selects)
- `BankAccountEditModal.tsx`
- `journal-entries/new/page.tsx`
- `PayrollConceptsTab.tsx` (3 selects)
- `CreatePrepaymentModal.tsx` (2 selects)
- `PaymentReceiptForm.tsx`
- `ThirdPartyForm.tsx` (2 selects)

**Consumidores con `showCreateButton={false}`** (no afectados):
- `account-mapping/page.tsx`
- `banking/page.tsx`
- `ClosingPreviewModal.tsx`

### 2. ThirdPartyForm — Filtros de cuentas y fixes

**Archivo**: `src/modules/third-parties/components/ThirdPartyForm.tsx`

- **Filtros de cuentas**: Se removieron `includePrefixes="13"` (CxC) e `includePrefixes="2"` (CxP). Ahora ambos selects usan `excludePrefixes="1110,1105"` para excluir solo cuentas de caja y bancos, permitiendo seleccionar cualquier otra cuenta.
- **Modal de creación removido**: Se eliminó el `Dialog` + `AccountForm` redundante que estaba en el form, ya que ahora `AccountSelect` lo maneja internamente.
- **Permisos → Módulos**: Se cambió `canAssignAccounts = can('third_parties.accounts.assign')` por `hasAccounting = hasModule('accounting')` usando `useCompanyModules`, ya que el permiso no existía en seeds.
- **Fix race condition municipios**: Se inicializa `useState` directamente con `initialData` en lugar de usar `useEffect` posterior. Se agregó flag `stale` al efecto de municipios para evitar que un fetch viejo sobreescriba datos correctos.
- **Labels de cuentas**: Se inicializan en `useState()` con initialData para evitar flash vacío en modo edición.

### 3. ThirdPartiesList — Filtro por rol

**Archivos**:
- `src/modules/third-parties/components/ThirdPartiesList.tsx`
- `src/modules/third-parties/hooks/useThirdParties.ts`

- Se agregó `SearchableSelect` para filtrar terceros por rol.
- Roles disponibles: Cliente, Proveedor, EPS, Fondo de Pensiones, ARL, Caja de Compensación, Fondo de Cesantías, SENA, ICBF, Otro.
- Se excluyeron del filtro: CO_OWNER, TENANT, CONTACT, EMPLOYEE (roles internos/PH).
- El hook `useThirdParties` ahora acepta `role` y expone `setRole()`, que resetea a página 1.
