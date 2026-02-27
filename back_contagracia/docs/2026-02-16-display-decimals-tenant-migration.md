# Migracion de display_decimals de master a tenant

## Contexto

`display_decimals` estaba como columna en la tabla `Company` del schema master. Esto causaba problemas porque:
1. Los servicios del tenant (accounting-service) necesitaban conocer `display_decimals` para la logica de redondeo, pero no tenian acceso directo al master.
2. La configuracion deberia vivir en el tenant junto con las demas `CompanySetting`.

## Cambios

### Schema master (`schema-master.prisma`)

Se elimino el campo `display_decimals Int @default(2)` del modelo `Company`.

Migracion: `20260216171104_remove_display_decimals_from_company`

### Company service (`companies.service.ts`)

**Antes:**
- `getCompanyProfile()` retornaba `company.display_decimals` directo del modelo Company
- `updateCompany()` guardaba `display_decimals` en Company del master

**Despues:**
- `getCompanyProfile()` lee `display_decimals` desde `CompanySetting` del tenant via `getDisplayDecimals(companyId)`
- `updateCompany()` separa `display_decimals` del resto de datos. Los campos normales van al master, `display_decimals` se guarda en tenant via `setDisplayDecimals(companyId, value)`
- El evento realtime se sigue emitiendo igual

### Nuevos metodos privados en CompaniesService

```ts
private async getDisplayDecimals(companyId: string): Promise<number>
// Lee CompanySetting { category: 'general', key: 'display_decimals' }
// Fallback: 2 si no existe o hay error

private async setDisplayDecimals(companyId: string, value: number): Promise<void>
// Upsert en CompanySetting { category: 'general', key: 'display_decimals' }
```

Usa `TenantContextService` para obtener el prisma client del tenant.

### Seed (`companySettings.ts`)

Se agrego `display_decimals` como primer setting en la categoria `general`:

```ts
{
  category: 'general',
  key: 'display_decimals',
  value: '2',
  value_type: 'number',
  description: 'Decimales a mostrar en UI (0-4). BD siempre guarda 4.',
  is_readonly: false,
}
```

## Lectura desde servicios del tenant

Ahora cualquier servicio del tenant puede leer `display_decimals` directamente:

```ts
const setting = await tx.companySetting.findFirst({
  where: { category: 'general', key: 'display_decimals' },
});
const displayDecimals = setting ? parseInt(setting.value, 10) : 2;
```

Esto se usa en:
- `create-payment-receipt-with-journal-entry.ts`
- `journal-entries.service.ts`

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `contagracia-shared-modules/prisma/schema-master.prisma` | Eliminar campo `display_decimals` de Company |
| `contagracia-shared-modules/prisma/migrations/20260216171104_...` | Migracion SQL |
| `contagracia-shared-modules/prisma/seeds/companySettings.ts` | Nuevo seed display_decimals |
| `company-service/src/modules/companies/companies.service.ts` | getDisplayDecimals, setDisplayDecimals, inyectar TenantContextService |
