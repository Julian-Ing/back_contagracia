# @contagracia/shared-database

Módulo compartido de base de datos con Prisma para todos los microservicios.

## 📦 Instalación

```bash
# En cualquier microservicio
pnpm add @contagracia/shared-database@workspace:*
```

## 🚀 Uso

### 1. Importar el módulo

```typescript
// auth-service/src/app.module.ts
import { DatabaseModule } from '@contagracia/shared-database';

@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
```

### 2. Usar Prisma Master (DB compartida)

```typescript
import { PrismaMasterService } from '@contagracia/shared-database';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaMasterService) {}

  async findUser(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
```

### 3. Usar Prisma Tenant (DB por empresa)

```typescript
import { PrismaTenantService } from '@contagracia/shared-database';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaTenantService) {}

  async create(companyId: string, data: CreateInvoiceDto) {
    // Obtener database_url de la empresa
    const company = await masterPrisma.company.findUnique({
      where: { id: companyId },
    });

    // Usar cliente específico de la empresa
    const client = PrismaTenantService.getClient(company.database_url);
    
    return client.invoice.create({ data });
  }
}
```

## 🔧 Configuración

Requiere variables de entorno:

```env
DATABASE_MASTER_URL="postgresql://user:password@localhost:5432/contagracia_master"
```

## 📝 Features

- ✅ Prisma Master Service (DB compartida)
- ✅ Prisma Tenant Service (DB por empresa)
- ✅ Cache de conexiones por empresa
- ✅ Gestión automática de conexión/desconexión
- ✅ Logs de queries

## ⚠️ Nota Importante - Prisma Clients

Los clientes Prisma se generan en ubicaciones separadas:
- **Master**: `@prisma/client-master`
- **Tenant**: `@prisma/client-tenant`

Esto permite usar ambos schemas en el mismo servicio sin conflictos.

```typescript
// prisma-master.service.ts usa:
import { PrismaClient } from '@prisma/client-master';

// prisma-tenant.service.ts usa:
import { PrismaClient } from '@prisma/client-tenant';
```

**IMPORTANTE**: Antes de compilar, ejecutar:
```bash
pnpm prisma:generate
```
