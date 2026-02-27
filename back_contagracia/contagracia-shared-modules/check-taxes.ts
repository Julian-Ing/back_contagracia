const { PrismaClient } = require('@prisma/client-tenant');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/tenant_dani_ml2odb2h' } }
});

async function main() {
  const taxes = await prisma.tax.findMany({
    include: { tax_type: true },
    orderBy: { code: 'asc' }
  });
  console.log('=== TAXES ===');
  taxes.forEach((t: any) => {
    console.log(t.code + ' | ' + t.name + ' | ' + t.rate + '% | TaxType: ' + t.tax_type?.name + ' (is_tax: ' + t.tax_type?.is_tax + ')');
  });

  console.log('\n=== TAX TYPES ===');
  const types = await prisma.taxType.findMany({ orderBy: { id: 'asc' } });
  types.forEach((tt: any) => {
    console.log('ID:' + tt.id + ' | ' + tt.code + ' | ' + tt.name + ' | is_tax: ' + tt.is_tax);
  });
}
main().finally(() => prisma.$disconnect());
