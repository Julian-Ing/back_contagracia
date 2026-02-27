/**
 * Seed de Tipos de Obligaciones Tributarias
 */
import { PrismaClient } from '@prisma/client-master';
import { taxObligationTypes } from './taxObligationTypes';

export async function seedTaxObligationTypes(prisma: PrismaClient) {
  console.log('📋 Seeding Tax Obligation Types...');

  let created = 0;
  let updated = 0;

  for (const type of taxObligationTypes) {
    const existing = await prisma.taxObligationType.findUnique({
      where: { code: type.code },
    });

    if (existing) {
      await prisma.taxObligationType.update({
        where: { code: type.code },
        data: type,
      });
      updated++;
    } else {
      await prisma.taxObligationType.create({
        data: type,
      });
      created++;
    }
  }

  console.log(`   ✓ Tax Obligation Types: ${created} creados, ${updated} actualizados`);
}
