# TenantContextService

Servicio para manejar conexiones multi-tenant, permisos y verificación de módulos.

## Ubicación

```
contagracia-shared-modules/shared-tenant-context/src/tenant-context.service.ts
```

## Métodos

### getTenantClient

Obtiene el cliente Prisma para un tenant específico.

```typescript
const prisma = await tenantContext.getTenantClient(companyId);
```

### hasModule

Verifica si una compañía tiene un módulo específico en su plan.

```typescript
const hasAccounting = await tenantContext.hasModule(companyId, 'accounting');
const hasBanking = await tenantContext.hasModule(companyId, 'banking');
```

#### Módulos disponibles

| module_key | Nombre |
|------------|--------|
| `accounting` | Contabilidad |
| `banking` | Bancos |
| `ar_ap` | Cuentas por Cobrar/Pagar |
| `fixed_assets` | Activos Fijos |
| `cost_centers` | Centros de Costos |
| `tax` | Impuestos |
| `closing` | Cierre Contable |
| `inventory` | Inventario |
| `pos` | Punto de Venta |
| `crm` | CRM |
| `hr` | Recursos Humanos |

### hasPermission

Verifica si un usuario tiene un permiso específico.

```typescript
const canCreate = await tenantContext.hasPermission(
  companyId,
  userId,
  roleKey,
  'bank_accounts.create'
);
```

### hasAnyPermission

Verifica si un usuario tiene al menos uno de los permisos.

```typescript
const canManage = await tenantContext.hasAnyPermission(
  companyId,
  userId,
  roleKey,
  ['bank_accounts.create', 'bank_accounts.edit']
);
```

### hasAllPermissions

Verifica si un usuario tiene todos los permisos.

```typescript
const hasFullAccess = await tenantContext.hasAllPermissions(
  companyId,
  userId,
  roleKey,
  ['bank_accounts.view', 'bank_accounts.create', 'bank_accounts.edit']
);
```

### getCompanyPlanLimits

Obtiene los límites del plan de una compañía.

```typescript
const limits = await tenantContext.getCompanyPlanLimits(companyId);
console.log(limits.maxUsers); // Incluye user_plus
```

## Ejemplo de Uso

```typescript
import { TenantContextService } from '@contagracia/shared-modules';

@Injectable()
export class MyService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async doSomething(companyId: string) {
    // Obtener cliente del tenant
    const prisma = await this.tenantContext.getTenantClient(companyId);

    // Verificar módulo
    const hasAccounting = await this.tenantContext.hasModule(companyId, 'accounting');

    if (hasAccounting) {
      // Lógica específica de contabilidad
    }
  }
}
```

## Compilación

El shared-tenant-context se compila in-place. Para recompilar:

```bash
cd contagracia-shared-modules/shared-tenant-context/src
rm -f *.js *.d.ts
npx tsc --declaration --module commonjs --target ES2021 \
  --esModuleInterop --skipLibCheck \
  --experimentalDecorators --emitDecoratorMetadata *.ts
```
