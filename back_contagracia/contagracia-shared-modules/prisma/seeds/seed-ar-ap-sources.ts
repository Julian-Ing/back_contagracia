import { PrismaClient } from '@prisma/client-master';

export const arApSources = [
  { key: 'invoice', description: 'Factura de Venta' },
  { key: 'purchase', description: 'Compra' },
  { key: 'expense', description: 'Gasto' },
  { key: 'invoice_credit_note', description: 'Nota Crédito de Venta' },
  { key: 'invoice_debit_note', description: 'Nota Débito de Venta' },
  { key: 'purchase_devolution', description: 'Devolución de Compra' },
  { key: 'expense_devolution', description: 'Devolución de Gasto' },
  { key: 'payroll', description: 'Nómina' },
  { key: 'travel_expense', description: 'Viáticos' },
  { key: 'manual', description: 'Asiento Manual' },
];

export async function seedArApSources(prisma: PrismaClient) {
  console.log('Seeding ar_ap_sources...');

  for (const source of arApSources) {
    await prisma.arApSource.upsert({
      where: { key: source.key },
      update: { description: source.description },
      create: source,
    });
  }

  console.log(`  ✓ ${arApSources.length} ar_ap sources`);
}
