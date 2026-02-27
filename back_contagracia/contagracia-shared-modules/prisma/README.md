# Prisma Schemas - Contagracia

Este directorio contiene los 2 schemas de Prisma para el sistema multi-tenant.

## 📦 Schemas

### 1. schema-master.prisma
**Base de datos**: `contagracia_master` (compartida)

**Tablas**:
- `users` - Usuarios del sistema
- `refresh_tokens` - Tokens de autenticación
- `companies` - Empresas (con database_name y database_url)
- `user_companies` - Relación usuarios-empresas
- `plans` - Planes de suscripción
- `subscriptions` - Suscripciones activas

### 2. schema-tenant.prisma
**Base de datos**: `contagracia_company_{uuid}` (una por empresa)

**Tablas**:
- `terceros` - Clientes, proveedores, empleados
- `invoices` + `invoice_items` - Facturación
- `products` - Inventario
- `purchases` + `purchase_items` - Compras
- `chart_of_accounts` - Plan de cuentas
- `audit_log` - Auditoría

## 🚀 Uso

### Generar Prisma Clients

```bash
# Generar client para DB maestra
npx prisma generate --schema=prisma/schema-master.prisma

# Generar client para DB tenant
npx prisma generate --schema=prisma/schema-tenant.prisma
```

### Crear migraciones

```bash
# Migración para DB maestra
npx prisma migrate dev --name init --schema=prisma/schema-master.prisma

# Migración para DB tenant
npx prisma migrate dev --name init --schema=prisma/schema-tenant.prisma
```

### Aplicar migraciones

```bash
# En DB maestra
npx prisma migrate deploy --schema=prisma/schema-master.prisma

# En DB tenant (se aplica a todas las empresas con script)
npx prisma migrate deploy --schema=prisma/schema-tenant.prisma
```

## 🔧 Variables de Entorno

```env
# Master database
DATABASE_MASTER_URL="postgresql://user:password@localhost:5432/contagracia_master"

# Tenant database (dinámico, se obtiene de companies.database_url)
DATABASE_TENANT_URL="postgresql://user:password@localhost:5432/contagracia_company_uuid"
```

## 📝 Notas

- Los Prisma Clients se generan en carpetas separadas:
  - Master: `@prisma/client-master`
  - Tenant: `@prisma/client-tenant`
  
- Esto permite usar ambos clients en el mismo servicio sin conflictos.
