/**
 * Seed Principal - Master Database (Orquestador)
 *
 * Uso:
 *   npx ts-node prisma/seeds/seed.ts
 */

import { PrismaClient } from '@prisma/client-master';
import { seedModules } from './modules';
import { seedPlans } from './seed-plans';
import { seedTaxes } from './seed-taxes';
import { seedBanks } from './seed-banks';
import { seedGeography } from './seed-geography';
import { seedCatalogs } from './seed-catalogs';
import { seedAdmin } from './seed-admin';
import { seedIntegrations } from './seed-integrations';
import { seedCms } from './seed-cms';
import { seedPuc } from './seed-puc';
import { seedAccountingConfig } from './seed-accounting-config';
import { seedJournalEntryTypes } from './seed-journal-entry-types';
import { seedBankMovementTypes } from './seed-bank-movement-types';
import { seedArApSources } from './seed-ar-ap-sources';
import { seedCompanyPaymentMethods } from './companyPaymentMethods';
import { seedTaxObligationTypes } from './seed-tax-obligation-types';
import { seedPayrollConcepts } from './seed-payroll-concepts';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Master Database...\n');

  // 0. Configurar extensión pg_trgm para búsqueda fuzzy
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_modules_module_name_trgm ON modules USING GIN (module_name gin_trgm_ops)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_modules_module_key_trgm ON modules USING GIN (module_key gin_trgm_ops)`);
    console.log('🔍 Extensión pg_trgm habilitada en master\n');
  } catch (error: any) {
    console.log(`⚠️  pg_trgm setup warning: ${error.message?.substring(0, 80)}\n`);
  }

  // 1. Módulos y acciones
  const moduleMap = await seedModules(prisma);

  // 2. Planes (depende de módulos)
  await seedPlans(prisma, moduleMap);

  // 3. Impuestos
  await seedTaxes(prisma);

  // 4. Bancos
  await seedBanks(prisma);

  // 5. Geografía (países, departamentos, municipios)
  await seedGeography(prisma);

  // 6. PUC (Plan Único de Cuentas) - antes de catálogos porque BankAdjustmentType referencia ChartOfAccount
  await seedPuc(prisma);

  // 7. Catálogos (documentos, organizaciones, regímenes, responsabilidades, unidades, métodos de pago, tasas)
  await seedCatalogs(prisma);

  // 8. Super Admin
  await seedAdmin(prisma);

  // 9. Integraciones
  await seedIntegrations(prisma);

  // 10. CMS - Landing Page
  await seedCms(prisma);

  // 11. Configuraciones de Contabilidad
  await seedAccountingConfig(prisma);

  // 12. Tipos de Asientos Contables
  await seedJournalEntryTypes(prisma);

  // 13. Tipos de Movimientos Bancarios
  await seedBankMovementTypes(prisma);

  // 14. Fuentes de AR/AP
  await seedArApSources(prisma);

  // 15. Métodos de pago personalizados por defecto
  await seedCompanyPaymentMethods(prisma);

  // 15. Tipos de Obligaciones Tributarias
  await seedTaxObligationTypes(prisma);
  // 16. Conceptos de Nómina
  await seedPayrollConcepts(prisma);

  console.log('═══════════════════════════════════════════');
  console.log('✅ Seed Master completado exitosamente');
  console.log('═══════════════════════════════════════════');
}

// Ejecutar
main()
  .catch((error) => {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
