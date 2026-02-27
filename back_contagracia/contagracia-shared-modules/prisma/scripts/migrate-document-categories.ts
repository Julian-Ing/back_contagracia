/**
 * Script para migrar documentos PH del campo `category` (string) al nuevo `category_id` (FK)
 *
 * Uso:
 *   npx ts-node --transpile-only prisma/scripts/migrate-document-categories.ts --force
 *
 * Qué hace:
 *   1. Para cada tenant activo, crea las 6 categorías default si no existen
 *   2. Migra documentos existentes: asigna category_id basado en el antiguo campo category (string)
 */

import { PrismaClient } from '@prisma/client-master';
import { PrismaClient as PrismaClientTenant } from '@prisma/client-tenant';

const masterPrisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Reglamento', slug: 'reglamento', color: '#3B82F6', icon: 'BookOpen', sort_order: 0 },
  { name: 'Acta', slug: 'acta', color: '#8B5CF6', icon: 'FileText', sort_order: 1 },
  { name: 'Contrato', slug: 'contrato', color: '#F59E0B', icon: 'FileSignature', sort_order: 2 },
  { name: 'Manual', slug: 'manual', color: '#10B981', icon: 'BookMarked', sort_order: 3 },
  { name: 'Certificado', slug: 'certificado', color: '#EF4444', icon: 'Award', sort_order: 4 },
  { name: 'Otro', slug: 'otro', color: '#6B7280', icon: 'File', sort_order: 5 },
];

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

async function migrateTenant(company: Company): Promise<{ categories: number; documents: number }> {
  const dbUrl = buildDatabaseUrl(company);
  const tenant = new PrismaClientTenant({
    datasources: { db: { url: dbUrl } },
  });

  try {
    // 1. Crear categorías default si no existen
    const existingCount = await tenant.phDocumentCategory.count({
      where: { company_id: company.id },
    });

    let categoriesCreated = 0;
    if (existingCount === 0) {
      await tenant.phDocumentCategory.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          company_id: company.id,
          ...cat,
        })),
      });
      categoriesCreated = DEFAULT_CATEGORIES.length;
    }

    // 2. Obtener mapa slug → id
    const categories = await tenant.phDocumentCategory.findMany({
      where: { company_id: company.id },
      select: { id: true, slug: true },
    });
    const slugToId = new Map(categories.map((c) => [c.slug, c.id]));

    // 3. Migrar documentos que tienen category_id null
    // Nota: el campo "category" ya no existe en el schema (fue renombrado a category_id)
    // Usamos raw SQL para leer la columna "category" si aún existe en la DB
    let docsMigrated = 0;
    try {
      const docsWithOldCategory: Array<{ id: string; category: string }> =
        await tenant.$queryRaw`
          SELECT id, category FROM ph_documents
          WHERE category IS NOT NULL AND category_id IS NULL
        `;

      for (const doc of docsWithOldCategory) {
        const catId = slugToId.get(doc.category);
        if (catId) {
          await tenant.phDocument.update({
            where: { id: doc.id },
            data: { category_id: catId },
          });
          docsMigrated++;
        }
      }
    } catch {
      // La columna "category" puede no existir si ya se hizo db push — es OK
    }

    return { categories: categoriesCreated, documents: docsMigrated };
  } finally {
    await tenant.$disconnect();
  }
}

async function main() {
  console.log('🔄 Migrate Document Categories Script');
  console.log('=====================================\n');

  const companies = await masterPrisma.$queryRaw<Company[]>`
    SELECT id, company_name, db_host, db_port, db_name, db_user, db_password, is_active
    FROM companies
    WHERE is_active = true AND db_name IS NOT NULL
  `;

  console.log(`📊 Found ${companies.length} active tenant(s)\n`);

  let totalCategories = 0;
  let totalDocs = 0;
  let failed = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    process.stdout.write(`[${i + 1}/${companies.length}] ${company.company_name}... `);

    try {
      const result = await migrateTenant(company);
      totalCategories += result.categories;
      totalDocs += result.documents;
      console.log(`✅ ${result.categories} categorías creadas, ${result.documents} docs migrados`);
    } catch (err: any) {
      failed++;
      console.log(`❌ ${err.message}`);
    }
  }

  console.log('\n=====================================');
  console.log(`📊 Resumen:`);
  console.log(`  Categorías creadas: ${totalCategories}`);
  console.log(`  Documentos migrados: ${totalDocs}`);
  console.log(`  Fallos: ${failed}`);
  console.log('✅ Migración completada');

  await masterPrisma.$disconnect();
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
