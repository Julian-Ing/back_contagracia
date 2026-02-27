/**
 * Seed CMS - Landing Page inicial con secciones por defecto
 * Se invoca desde seed.ts (paso 18)
 */

import { PrismaClient } from '@prisma/client-master';
import * as fs from 'fs';
import * as path from 'path';

const SEED_ASSETS = [
  { src: 'hero-light.png', dest: 'seed-hero-light.png' },
  { src: 'hero-dark.jpg', dest: 'seed-hero-dark.jpg' },
  { src: 'benefits.png', dest: 'seed-benefits.png' },
];

const LANDING_PAGE = {
  slug: 'home',
  title: 'Página Principal',
  description: 'Landing page principal de ContaGracia',
  page_type: 'landing',
  is_active: true,
  is_published: true,
  published_at: new Date(),
  show_in_header: false,
  show_in_footer: false,
  meta_title: 'ContaGracia - Software Contable para MiPymes',
  meta_description:
    'Software contable especializado para MiPymes colombianas. Facturación electrónica, inventario, contabilidad y nómina.',
};

const LANDING_SECTIONS = [
  {
    section_key: 'hero',
    section_type: 'hero',
    title: 'Software Contable para MiPymes',
    subtitle: 'Simplifica tu contabilidad',
    display_order: 0,
    is_active: true,
    content: {
      badge: 'Software #1 para MiPymes',
      description:
        'Software contable especializado para MiPymes colombianas. Facturación electrónica, inventario, contabilidad y nómina en un solo lugar.',
      ctaPrimary: 'Comenzar',
      ctaSecondary: 'Soporte WhatsApp',
      email: 'soporte@contagracia.com',
      stats: [
        { value: '500+', label: 'Empresas Activas' },
        { value: '99.9%', label: 'Tiempo Activo' },
        { value: 'Lunes a Viernes', label: 'Soporte' },
      ],
      imageLight: '/uploads/cms/seed-hero-light.png',
      imageDark: '/uploads/cms/seed-hero-dark.jpg',
      backgroundColorDark: 'bg-slate-900',
    },
  },
  {
    section_key: 'features',
    section_type: 'feature_grid',
    title: 'Todo lo que necesitas',
    subtitle: 'Herramientas diseñadas para tu negocio',
    display_order: 1,
    is_active: true,
    content: {
      features: [
        {
          icon: 'Package',
          title: 'Gestión de Inventario',
          description:
            'Control total de tu inventario con seguimiento en tiempo real, alertas de stock y reportes detallados.',
          color: 'from-purple-500 to-indigo-500',
        },
        {
          icon: 'Calculator',
          title: 'Contabilidad Automatizada',
          description:
            'Automatiza tu contabilidad con plan de cuentas colombiano, asientos automáticos y estados financieros.',
          color: 'from-cyan-500 to-blue-500',
        },
        {
          icon: 'BarChart3',
          title: 'Reportes Avanzados',
          description:
            'Genera reportes financieros, tributarios y operativos con un clic. Exporta a Excel y PDF.',
          color: 'from-orange-500 to-red-500',
        },
        {
          icon: 'Clock',
          title: 'Tiempo Real',
          description:
            'Datos actualizados en tiempo real. Toma decisiones informadas con información al instante.',
          color: 'from-green-500 to-emerald-500',
        },
        {
          icon: 'Shield',
          title: 'Seguridad Avanzada',
          description:
            'Protección de datos con encriptación, respaldos automáticos y control de acceso por roles.',
          color: 'from-pink-500 to-rose-500',
        },
      ],
    },
  },
  {
    section_key: 'benefits',
    section_type: 'benefits',
    title: '¿Por qué ContaGracia?',
    subtitle: 'Beneficios que marcan la diferencia',
    display_order: 2,
    is_active: true,
    content: {
      image: '/uploads/cms/seed-benefits.png',
      imageAlt: 'ContaGracia Dashboard',
      benefits: [
        { text: 'Soporte técnico especializado', schedule: 'Lunes a Viernes: 8am - 5pm' },
        { text: 'Actualizaciones automáticas incluidas' },
        { text: 'Capacitación personalizada para tu equipo' },
        { text: 'Integración con DIAN para facturación electrónica' },
      ],
    },
  },
  {
    section_key: 'pricing',
    section_type: 'pricing',
    title: 'Planes y Precios',
    subtitle: 'Elige el plan que mejor se adapte a tu negocio',
    display_order: 3,
    is_active: true,
    content: {},
  },
  {
    section_key: 'blog',
    section_type: 'blog_section',
    title: 'Blog',
    subtitle: 'Últimas noticias y artículos',
    display_order: 4,
    is_active: true,
    content: {
      titleGradient: 'from-cyan-500 to-blue-600',
      postsLimit: 3,
      buttonText: 'Ver todos los artículos',
    },
  },
  {
    section_key: 'cta',
    section_type: 'cta',
    title: 'Comienza hoy',
    subtitle: 'Tu negocio merece lo mejor',
    display_order: 5,
    is_active: true,
    content: {
      primaryButton: { text: 'Prueba Gratuita 7 Días', color: 'from-purple-600 to-pink-600' },
      secondaryButton: { text: 'Solicitar Demo' },
      benefits: 'Sin compromiso \u2022 Configuración en 5 minutos \u2022 Soporte incluido',
      backgroundColor: 'from-purple-900/50 to-pink-900/50',
    },
  },
];

export async function seedCms(prisma: PrismaClient) {
  console.log('📄 Seeding CMS Landing Page...');

  // Copy seed assets to uploads/cms
  const assetsDir = path.resolve(__dirname, 'assets');
  const uploadsDir = path.resolve(process.cwd(), '..', 'uploads', 'cms');
  fs.mkdirSync(uploadsDir, { recursive: true });
  let assetsCopied = 0;
  for (const asset of SEED_ASSETS) {
    const srcPath = path.join(assetsDir, asset.src);
    const destPath = path.join(uploadsDir, asset.dest);
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      assetsCopied++;
    }
  }
  if (assetsCopied > 0) console.log(`   📷 ${assetsCopied} imágenes copiadas a uploads/cms`);

  const page = await prisma.page.upsert({
    where: { slug: LANDING_PAGE.slug },
    update: {
      title: LANDING_PAGE.title,
      description: LANDING_PAGE.description,
      page_type: LANDING_PAGE.page_type,
      meta_title: LANDING_PAGE.meta_title,
      meta_description: LANDING_PAGE.meta_description,
    },
    create: LANDING_PAGE,
  });

  await prisma.siteSection.deleteMany({ where: { page_id: page.id } });
  for (const section of LANDING_SECTIONS) {
    await prisma.siteSection.create({
      data: { ...section, page_id: page.id },
    });
  }

  console.log(`   ✅ Página "${page.title}" (slug: ${page.slug})`);
  console.log(`   ✅ ${LANDING_SECTIONS.length} secciones CMS`);
  console.log('');
}
