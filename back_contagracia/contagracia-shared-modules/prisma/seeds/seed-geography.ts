import { PrismaClient } from '@prisma/client-master';
import { countries } from './countries';
import { departments } from './departments';
import { municipalities } from './municipalities';

export async function seedGeography(prisma: PrismaClient) {
  console.log('🌍 Seeding Countries...');
  for (const country of countries) {
    await prisma.country.upsert({
      where: { id: country.id },
      update: { code: country.code, name: country.name },
      create: { id: country.id, code: country.code, name: country.name },
    });
  }
  console.log(`   ✅ ${countries.length} países creados\n`);

  console.log('🏛️ Seeding Departments...');
  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { country_id: dept.country_id, code: dept.code, name: dept.name },
      create: { id: dept.id, country_id: dept.country_id, code: dept.code, name: dept.name },
    });
  }
  console.log(`   ✅ ${departments.length} departamentos creados\n`);

  console.log('🏘️ Seeding Municipalities...');
  for (const mun of municipalities) {
    await prisma.municipality.upsert({
      where: { id: mun.id },
      update: { department_id: mun.department_id, code: mun.code, name: mun.name, dian_code: mun.dian_code },
      create: { id: mun.id, department_id: mun.department_id, code: mun.code, name: mun.name, dian_code: mun.dian_code },
    });
  }
  console.log(`   ✅ ${municipalities.length} municipios creados\n`);
}
