/**
 * Script para crear los roles PH en tenants que tengan el módulo PH activo:
 *   - ph_resident: residente con acceso limitado (vistas + PQRS + reservas)
 *   - ph_portero:  portero con acceso exclusivo al módulo de portería
 *
 * Los roles se crean condicionalmente: solo si el plan del tenant incluye el módulo 'ph'.
 *
 * Uso:
 *   npx ts-node --transpile-only prisma/scripts/seed-ph-roles.ts
 *   npx ts-node --transpile-only prisma/scripts/seed-ph-roles.ts --force
 */

import { PrismaClient as MasterPrismaClient } from '@prisma/client-master';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';

const masterPrisma = new MasterPrismaClient();

/** Permisos limitados para el rol ph_resident (solo vistas + PQRS + reservas) */
const PH_RESIDENT_PERMISSIONS = [
  'ph.view',
  'ph.dashboard.view',
  'ph.condominiums.view',
  'ph.units.view',
  'ph.residents.view',
  'ph.vehicles.view',
  'ph.common_areas.view',
  'ph.reservations.view',
  'ph.reservations.create',
  'ph.billing.view',
  'ph.assemblies.view',
  'ph.pqrs.view',
  'ph.pqrs.create',
  'ph.pqrs.respond',
];

/** Permisos para el rol ph_portero (solo módulo portería) */
const PH_PORTERO_PERMISSIONS = [
  'ph.view',
  'ph.dashboard.view',
  'ph.porteria.view',
  'ph.porteria.manage_access',
  'ph.porteria.manage_packages',
  'ph.porteria.manage_minuta',
];

interface Company {
  id: string;
  company_name: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
}

function buildDatabaseUrl(company: Company): string {
  return `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;
}

/**
 * Crea el rol ph_resident en un tenant si el módulo PH está activo
 * Retorna true si el rol fue creado o ya existía, false si PH no está activo
 */
export async function seedPhResidentRole(
  tenantPrisma: TenantPrismaClient,
  companyId: string,
  masterClient?: MasterPrismaClient,
): Promise<{ created: boolean; permissions: number }> {
  const master = masterClient || masterPrisma;

  // Verificar si el módulo PH está en el plan activo de la empresa
  const subscription = await master.subscription.findFirst({
    where: {
      company_id: companyId,
      OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
    },
    include: {
      plan: {
        include: {
          plan_modules: {
            include: { module: true },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!subscription) return { created: false, permissions: 0 };

  const moduleKeys = subscription.plan.plan_modules.map((pm) => pm.module.module_key);
  if (!moduleKeys.includes('ph')) {
    return { created: false, permissions: 0 };
  }

  // Crear o verificar el rol
  let role = await tenantPrisma.role.findFirst({
    where: { role_key: 'ph_resident' },
  });

  let created = false;
  if (!role) {
    role = await tenantPrisma.role.create({
      data: {
        role_key: 'ph_resident',
        role_name: 'Residente PH',
        description: 'Residente de copropiedad con acceso limitado al módulo PH',
        is_system: false,
      },
    });
    created = true;
  }

  // Asignar permisos (upsert para idempotencia)
  let permCount = 0;
  for (const actionKey of PH_RESIDENT_PERMISSIONS) {
    // Verificar que la acción exista en el tenant
    const action = await tenantPrisma.systemAction.findFirst({
      where: { action_key: actionKey },
    });
    if (!action) continue;

    try {
      await tenantPrisma.rolePermission.upsert({
        where: {
          role_id_action_key: {
            role_id: role.id,
            action_key: actionKey,
          },
        },
        update: { granted: true },
        create: {
          role_id: role.id,
          action_key: actionKey,
          granted: true,
        },
      });
      permCount++;
    } catch {
      // Ignorar duplicados
    }
  }

  return { created, permissions: permCount };
}

/**
 * Crea el rol ph_portero en un tenant si el módulo PH está activo
 */
export async function seedPhPorteroRole(
  tenantPrisma: TenantPrismaClient,
  companyId: string,
  masterClient?: MasterPrismaClient,
): Promise<{ created: boolean; permissions: number }> {
  const master = masterClient || masterPrisma;

  // Verificar si el módulo PH está en el plan activo de la empresa
  const subscription = await master.subscription.findFirst({
    where: {
      company_id: companyId,
      OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
    },
    include: {
      plan: {
        include: {
          plan_modules: {
            include: { module: true },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!subscription) return { created: false, permissions: 0 };

  const moduleKeys = subscription.plan.plan_modules.map((pm) => pm.module.module_key);
  if (!moduleKeys.includes('ph')) {
    return { created: false, permissions: 0 };
  }

  // Crear o verificar el rol
  let role = await tenantPrisma.role.findFirst({
    where: { role_key: 'ph_portero' },
  });

  let created = false;
  if (!role) {
    role = await tenantPrisma.role.create({
      data: {
        role_key: 'ph_portero',
        role_name: 'Portero PH',
        description: 'Portero de copropiedad con acceso exclusivo al módulo de portería',
        is_system: false,
      },
    });
    created = true;
  }

  // Asignar permisos (upsert para idempotencia)
  let permCount = 0;
  for (const actionKey of PH_PORTERO_PERMISSIONS) {
    const action = await tenantPrisma.systemAction.findFirst({
      where: { action_key: actionKey },
    });
    if (!action) continue;

    try {
      await tenantPrisma.rolePermission.upsert({
        where: {
          role_id_action_key: {
            role_id: role.id,
            action_key: actionKey,
          },
        },
        update: { granted: true },
        create: {
          role_id: role.id,
          action_key: actionKey,
          granted: true,
        },
      });
      permCount++;
    } catch {
      // Ignorar duplicados
    }
  }

  return { created, permissions: permCount };
}

// ── Script standalone ──────────────────────────────────────────

async function main() {
  const isForce = process.argv.includes('--force');

  console.log('🏠 Seed PH Roles (ph_resident + ph_portero)');
  console.log('============================================\n');

  const companies = await masterPrisma.company.findMany({
    where: { is_active: true },
    select: {
      id: true,
      company_name: true,
      db_host: true,
      db_port: true,
      db_name: true,
      db_user: true,
      db_password: true,
    },
  });

  console.log(`📊 Found ${companies.length} active tenant(s)\n`);

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    console.log(`[${i + 1}/${companies.length}] ${company.company_name} (${company.db_name})`);

    try {
      const tenantPrisma = new TenantPrismaClient({
        datasources: { db: { url: buildDatabaseUrl(company) } },
      });

      const residentResult = await seedPhResidentRole(tenantPrisma, company.id, masterPrisma);
      const porteroResult = await seedPhPorteroRole(tenantPrisma, company.id, masterPrisma);
      await tenantPrisma.$disconnect();

      if (!residentResult.created && residentResult.permissions === 0) {
        console.log('  ⏭️  PH no activo en el plan, saltando');
      } else {
        if (residentResult.created) {
          console.log(`  ✅ Rol ph_resident CREADO con ${residentResult.permissions} permisos`);
        } else {
          console.log(`  ℹ️  Rol ph_resident ya existía, ${residentResult.permissions} permisos sincronizados`);
        }
        if (porteroResult.created) {
          console.log(`  ✅ Rol ph_portero CREADO con ${porteroResult.permissions} permisos`);
        } else {
          console.log(`  ℹ️  Rol ph_portero ya existía, ${porteroResult.permissions} permisos sincronizados`);
        }
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message?.substring(0, 80)}`);
    }
  }

  console.log('\n✅ Seed PH Roles completado');
}

// Solo ejecutar main() si se corre como script standalone
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await masterPrisma.$disconnect();
    });
}
