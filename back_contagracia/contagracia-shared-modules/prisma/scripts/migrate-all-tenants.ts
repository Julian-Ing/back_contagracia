/**
 * Script para aplicar migraciones a TODAS las bases de datos de tenants
 *
 * Uso:
 *   npx ts-node prisma/scripts/migrate-all-tenants.ts
 *
 * Opciones:
 *   --dry-run    Solo muestra qué haría, sin ejecutar
 *   --force      No pide confirmación
 */

import { PrismaClient } from '@prisma/client-master';
import { PrismaClient as PrismaClientTenant } from '@prisma/client-tenant';
import { execSync } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

const masterPrisma = new PrismaClient();

interface Company {
  id: string;
  company_name: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
  is_active: boolean;
}

function buildDatabaseUrl(company: Company): string {
  return `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;
}

async function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Crea extensión pg_trgm e índices GIN para búsqueda fuzzy
 */
async function setupFuzzySearch(dbUrl: string, companyName: string): Promise<void> {
  const tenantClient = new PrismaClientTenant({
    datasources: { db: { url: dbUrl } },
  });
  try {
    await tenantClient.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tp_name_trgm ON "third_parties" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tp_id_number_trgm ON "third_parties" USING gin ("identification_number" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_coa_name_trgm ON "chart_of_accounts" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_name_trgm ON "type_documents" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_code_trgm ON "type_documents" USING gin ("code" gin_trgm_ops)`);
    // Categorías de producto
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pc_name_trgm ON "product_categories" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pc_consecutive_trgm ON "product_categories" USING gin ("consecutive" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pc_description_trgm ON "product_categories" USING gin ("description" gin_trgm_ops)`);
    // Productos
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_prod_name_trgm ON "products" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_prod_consecutive_trgm ON "products" USING gin ("consecutive" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_prod_description_trgm ON "products" USING gin ("description" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_prod_barcode_trgm ON "products" USING gin ("barcode" gin_trgm_ops)`);
    // Atributos
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pa_name_trgm ON "product_attributes" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pa_consecutive_trgm ON "product_attributes" USING gin ("consecutive" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pa_description_trgm ON "product_attributes" USING gin ("description" gin_trgm_ops)`);
    // Opciones de atributo
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pao_name_trgm ON "product_attribute_options" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_pao_consecutive_trgm ON "product_attribute_options" USING gin ("consecutive" gin_trgm_ops)`);
    // Almacenes
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_wh_name_trgm ON "warehouses" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_wh_consecutive_trgm ON "warehouses" USING gin ("consecutive" gin_trgm_ops)`);
    // Bodegas
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_st_name_trgm ON "storages" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_st_consecutive_trgm ON "storages" USING gin ("consecutive" gin_trgm_ops)`);
    // Centros de costos
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cc_name_trgm ON "cost_centers" USING gin ("name" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cc_consecutive_trgm ON "cost_centers" USING gin ("consecutive" gin_trgm_ops)`);
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cc_description_trgm ON "cost_centers" USING gin ("description" gin_trgm_ops)`);
    // Movimientos de centro de costos
    await tenantClient.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_ccm_description_trgm ON "cost_center_movements" USING GIN (description gin_trgm_ops)`);
    console.log(`  🔍 pg_trgm + indexes OK`);
  } catch (error: any) {
    console.log(`  ⚠️  pg_trgm setup warning: ${error.message?.substring(0, 80)}`);
  } finally {
    await tenantClient.$disconnect();
  }
}

async function migrateAllTenants() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');

  console.log('🔄 Migrate All Tenants Script');
  console.log('=============================\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // 1. Obtener todas las empresas activas
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
      is_active: true,
    },
  });

  console.log(`📊 Found ${companies.length} active tenant(s)\n`);

  if (companies.length === 0) {
    console.log('✅ No tenants to migrate');
    return;
  }

  // Mostrar resumen
  console.log('Tenants to migrate:');
  companies.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.company_name} (${c.db_name})`);
  });
  console.log('');

  // Confirmar si no es force
  if (!isForce && !isDryRun) {
    const confirmed = await askConfirmation(
      `⚠️  This will run migrations on ${companies.length} database(s). Continue? (y/N): `,
    );
    if (!confirmed) {
      console.log('❌ Aborted by user');
      process.exit(0);
    }
  }

  // 2. Path al schema del tenant
  const schemaPath = path.join(__dirname, '..', 'schema-tenant.prisma');

  // 3. Migrar cada tenant
  const results: { company: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const dbUrl = buildDatabaseUrl(company);

    console.log(`\n[${i + 1}/${companies.length}] Migrating: ${company.company_name} (${company.db_name})`);

    if (isDryRun) {
      console.log(`  Would run: DATABASE_TENANT_URL="***" npx prisma db push --schema=${schemaPath}`);
      results.push({ company: company.company_name, success: true });
      continue;
    }

    try {
      // Ejecutar prisma db push para este tenant
      execSync(
        `npx prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`,
        {
          env: {
            ...process.env,
            DATABASE_TENANT_URL: dbUrl,
          },
          stdio: 'pipe',
          cwd: path.join(__dirname, '..', '..'),
        },
      );

      console.log(`  ✅ Schema pushed`);

      // Crear extensión pg_trgm e índices para búsqueda fuzzy
      await setupFuzzySearch(dbUrl, company.company_name);



      results.push({ company: company.company_name, success: true });
    } catch (error: any) {
      const errorMessage = error.stderr?.toString() || error.message || 'Unknown error';
      console.log(`  ❌ Failed: ${errorMessage.substring(0, 100)}`);
      results.push({ company: company.company_name, success: false, error: errorMessage });
    }
  }

  // 4. Resumen final
  console.log('\n=============================');
  console.log('📊 Migration Summary\n');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed tenants:');
    failed.forEach((f) => {
      console.log(`  - ${f.company}: ${f.error?.substring(0, 80)}...`);
    });
  }

  console.log('\n✅ Migration process completed');
}

// Ejecutar
migrateAllTenants()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await masterPrisma.$disconnect();
  });
