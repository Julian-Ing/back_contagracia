/**
 * Pre-migración: Merge EmployeeProfile → ThirdParty
 *
 * Este script renombra employee_profile_id → third_party_id en todas las tablas hijo,
 * mapeando los IDs de EmployeeProfile a los IDs de ThirdParty correspondientes.
 * Luego elimina la tabla employee_profiles.
 *
 * Ejecutar ANTES de prisma db push:
 *   npx ts-node --transpile-only prisma/scripts/pre-migrate-employee-profile.ts --force
 */

import { PrismaClient } from '@prisma/client-master';
import { PrismaClient as PrismaClientTenant } from '@prisma/client-tenant';

const masterPrisma = new PrismaClient();

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

const CHILD_TABLES = [
  'employee_contracts',
  'salary_history',
  'attendance_records',
  'overtime_records',
  'leave_requests',
  'employee_travel_expenses',
];

// Tablas que también tienen approved_by_id apuntando a employee_profiles
const TABLES_WITH_APPROVER = [
  'overtime_records',
  'leave_requests',
  'employee_travel_expenses',
];

async function migratetenant(dbUrl: string, companyName: string): Promise<void> {
  const tenant = new PrismaClientTenant({
    datasources: { db: { url: dbUrl } },
  });

  try {
    // Verificar si la tabla employee_profiles existe
    const tableExists = await tenant.$queryRawUnsafe<any[]>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'employee_profiles'
      ) as exists
    `);

    if (!tableExists[0]?.exists) {
      console.log(`  ⏭️  employee_profiles ya no existe, saltando`);
      return;
    }

    // Verificar si ya se migró completamente (employee_profiles ya no existe)
    // No saltar si employee_profiles aún existe — puede ser migración parcial

    // 1. Para cada tabla hijo, agregar third_party_id nullable
    for (const table of CHILD_TABLES) {
      const colExists = await tenant.$queryRawUnsafe<any[]>(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = 'employee_profile_id'
        ) as exists
      `);

      if (!colExists[0]?.exists) {
        console.log(`  ⏭️  ${table}: no tiene employee_profile_id, saltando`);
        continue;
      }

      // Agregar columna third_party_id nullable
      await tenant.$executeRawUnsafe(`
        ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "third_party_id" TEXT
      `);

      // Mapear: employee_profile_id → third_party_id via employee_profiles.third_party_id
      await tenant.$executeRawUnsafe(`
        UPDATE "${table}" t
        SET "third_party_id" = ep."third_party_id"
        FROM "employee_profiles" ep
        WHERE t."employee_profile_id" = ep."id"
      `);

      // Verificar que no quedaron NULLs
      const nullCount = await tenant.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*) as cnt FROM "${table}" WHERE "third_party_id" IS NULL AND "employee_profile_id" IS NOT NULL
      `);

      if (Number(nullCount[0]?.cnt) > 0) {
        console.log(`  ⚠️  ${table}: ${nullCount[0].cnt} filas sin mapear (employee_profile no encontrado)`);
      }

      // Eliminar constraint de FK vieja si existe
      const fkConstraints = await tenant.$queryRawUnsafe<any[]>(`
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = '${table}' AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%employee_profile_id%'
      `);
      for (const fk of fkConstraints) {
        await tenant.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`);
      }

      // Eliminar índices viejos que referencian employee_profile_id
      const oldIndexes = await tenant.$queryRawUnsafe<any[]>(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = '${table}' AND indexdef LIKE '%employee_profile_id%'
      `);
      for (const idx of oldIndexes) {
        await tenant.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx.indexname}"`);
      }

      // Eliminar columna vieja
      await tenant.$executeRawUnsafe(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "employee_profile_id"`);

      // Hacer third_party_id NOT NULL (solo si hay datos o la tabla está vacía)
      await tenant.$executeRawUnsafe(`
        DELETE FROM "${table}" WHERE "third_party_id" IS NULL
      `);
      await tenant.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "third_party_id" SET NOT NULL`);

      console.log(`  ✅ ${table}: employee_profile_id → third_party_id`);
    }

    // 2. Para tablas con approved_by_id, mapear también
    for (const table of TABLES_WITH_APPROVER) {
      const approverColExists = await tenant.$queryRawUnsafe<any[]>(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = 'approved_by_id'
        ) as exists
      `);

      if (!approverColExists[0]?.exists) continue;

      // approved_by_id ya apunta a employee_profiles.id, necesitamos que apunte a third_parties.id
      // Crear columna temporal
      await tenant.$executeRawUnsafe(`
        ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "approved_by_id_new" TEXT
      `);

      await tenant.$executeRawUnsafe(`
        UPDATE "${table}" t
        SET "approved_by_id_new" = ep."third_party_id"
        FROM "employee_profiles" ep
        WHERE t."approved_by_id" = ep."id"
      `);

      // Eliminar FK vieja de approved_by_id
      const fkApprover = await tenant.$queryRawUnsafe<any[]>(`
        SELECT tc.constraint_name FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = '${table}' AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'approved_by_id'
      `);
      for (const fk of fkApprover) {
        await tenant.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`);
      }

      // Reemplazar columna
      await tenant.$executeRawUnsafe(`ALTER TABLE "${table}" DROP COLUMN "approved_by_id"`);
      await tenant.$executeRawUnsafe(`ALTER TABLE "${table}" RENAME COLUMN "approved_by_id_new" TO "approved_by_id"`);

      console.log(`  ✅ ${table}: approved_by_id remapeado a ThirdParty`);
    }

    // 3. Agregar current_contract_id y current_salary_id a third_parties
    await tenant.$executeRawUnsafe(`
      ALTER TABLE "third_parties" ADD COLUMN IF NOT EXISTS "current_contract_id" TEXT
    `);
    await tenant.$executeRawUnsafe(`
      ALTER TABLE "third_parties" ADD COLUMN IF NOT EXISTS "current_salary_id" TEXT
    `);

    // Mapear desde employee_profiles
    await tenant.$executeRawUnsafe(`
      UPDATE "third_parties" tp
      SET
        "current_contract_id" = ep."current_contract_id",
        "current_salary_id" = ep."current_salary_id"
      FROM "employee_profiles" ep
      WHERE tp."id" = ep."third_party_id"
    `);

    console.log(`  ✅ third_parties: current_contract_id + current_salary_id migrados`);

    // 4. Eliminar tabla employee_profiles
    await tenant.$executeRawUnsafe(`DROP TABLE IF EXISTS "employee_profiles" CASCADE`);
    console.log(`  ✅ employee_profiles eliminada`);

  } finally {
    await tenant.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isForce = args.includes('--force');

  console.log('🔄 Pre-Migration: EmployeeProfile → ThirdParty');
  console.log('================================================\n');

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

  if (companies.length === 0) {
    console.log('✅ No tenants to migrate');
    return;
  }

  companies.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.company_name} (${c.db_name})`);
  });
  console.log('');

  const results: { company: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const dbUrl = buildDatabaseUrl(company);

    console.log(`\n[${i + 1}/${companies.length}] ${company.company_name} (${company.db_name})`);

    try {
      await migrateTarget(dbUrl, company.company_name);
      results.push({ company: company.company_name, success: true });
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message?.substring(0, 200)}`);
      results.push({ company: company.company_name, success: false, error: error.message });
    }
  }

  console.log('\n================================================');
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed tenants:');
    failed.forEach((f) => console.log(`  - ${f.company}: ${f.error}`));
  }

  console.log('\n✅ Pre-migration completed');
}

async function migrateTarget(dbUrl: string, name: string) {
  return migratetenant(dbUrl, name);
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await masterPrisma.$disconnect();
  });
