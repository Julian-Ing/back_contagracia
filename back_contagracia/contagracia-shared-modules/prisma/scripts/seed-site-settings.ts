/**
 * Script para insertar configuraciones iniciales del sitio en la tabla site_settings (master)
 *
 * Uso:
 *   npx ts-node --transpile-only prisma/scripts/seed-site-settings.ts
 */

import { PrismaClient } from '@prisma/client-master';

const prisma = new PrismaClient();

const SETTINGS = [
  {
    key: 'site_title',
    value: 'Contagracia - Software Contable para MiPymes',
    description: 'Título del sitio (aparece en la pestaña del navegador y en Google)',
  },
  {
    key: 'site_description',
    value:
      'Software contable especializado para MiPymes con gestión inteligente de inventario. Automatiza tu contabilidad y toma el control total de tu negocio.',
    description: 'Meta descripción del sitio (aparece en resultados de Google)',
  },
  {
    key: 'site_keywords',
    value: 'contabilidad, erp, pymes, colombia, software contable, facturación electrónica, nómina, inventario',
    description: 'Palabras clave SEO separadas por comas',
  },
  {
    key: 'og_image_url',
    value: null,
    description: 'URL de la imagen Open Graph (aparece al compartir en redes sociales, recomendado 1200x630)',
  },
  {
    key: 'favicon_url',
    value: null,
    description: 'URL del favicon personalizado (.ico, .png o .svg)',
  },
  {
    key: 'tracking_scripts',
    value: null,
    description: 'Scripts de seguimiento HTML/JS (Google Analytics, Meta Pixel, GTM, etc.)',
  },
];

async function main() {
  console.log('🌱 Seeding site_settings...');

  for (const setting of SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {
        description: setting.description,
      },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    });
    console.log(`  ✅ ${setting.key}`);
  }

  console.log(`\n✅ ${SETTINGS.length} site settings seeded successfully`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding site settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
