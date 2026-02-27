/**
 * Script de migración: mueve archivos existentes de uploads/ al nuevo formato
 * de media-service y registra cada archivo en la tabla `media`.
 *
 * Uso:
 *   cd media-service
 *   npx ts-node --transpile-only scripts/migrate-existing-uploads.ts
 *
 * Flags:
 *   --dry-run   Solo muestra lo que haría, sin mover ni escribir en DB
 *   --cleanup   Elimina las carpetas viejas de uploads/ después de migrar
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client-master');

const DRY_RUN = process.argv.includes('--dry-run');
const CLEANUP = process.argv.includes('--cleanup');

const DATABASE_URL =
  process.env.DATABASE_MASTER_URL ||
  'postgresql://postgres:root@localhost:5432/contagracia_master?schema=public';

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

// Ruta base del backend (parent del media-service)
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const OLD_UPLOADS = path.join(BACKEND_ROOT, 'uploads');
const NEW_UPLOADS = path.join(BACKEND_ROOT, 'uploads', 'media');

// System user ID for migrated files
const SYSTEM_USER_ID = 'system-migration';

interface MigrationResult {
  category: string;
  oldPath: string;
  newPath: string;
  mediaId: string;
  dbUpdated: string;
}

const results: MigrationResult[] = [];
const errors: string[] = [];

// ─── Helpers ─────────────────────────────────────────────────

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.p12': 'application/x-pkcs12',
    '.pfx': 'application/x-pkcs12',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src: string, dest: string) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Copy: ${src} → ${dest}`);
    return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

async function createMediaRecord(
  originalName: string,
  newFileName: string,
  mimeType: string,
  size: number,
  category: string,
  visibility: string,
  companyId: string | null,
  storagePath: string,
): Promise<string> {
  const id = randomUUID();
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] INSERT media: id=${id}, category=${category}, file=${originalName}`);
    return id;
  }
  await prisma.media.create({
    data: {
      id,
      original_name: originalName,
      file_name: newFileName,
      mime_type: mimeType,
      size,
      category,
      visibility,
      uploaded_by: SYSTEM_USER_ID,
      storage_path: storagePath,
      is_active: true,
    },
  });
  return id;
}

function migrateFile(
  absoluteOldPath: string,
  category: string,
  companyId: string | null,
): { newFileName: string; storagePath: string; absoluteNewPath: string; size: number } | null {
  if (!fs.existsSync(absoluteOldPath)) {
    errors.push(`File not found: ${absoluteOldPath}`);
    return null;
  }

  const ext = path.extname(absoluteOldPath);
  const newFileName = `${randomUUID()}${ext}`;
  const subFolder = companyId || 'global';
  const storagePath = `${category}/${subFolder}/${newFileName}`;
  const absoluteNewPath = path.join(NEW_UPLOADS, category, subFolder, newFileName);

  const stats = fs.statSync(absoluteOldPath);
  copyFile(absoluteOldPath, absoluteNewPath);

  return { newFileName, storagePath, absoluteNewPath, size: stats.size };
}

// ─── Migration: Company logos & signatures ───────────────────

async function migrateCompanyFiles() {
  console.log('\n=== Migrando logos y firmas de empresas ===');

  // NOTA: legal_rep_signature_url ya no existe en master Company (migrado a tenant CompanySetting).
  // Este script solo migra logo_url de master.
  const companies = await prisma.company.findMany({
    where: {
      logo_url: { not: null },
    },
    select: {
      id: true,
      nit: true,
      logo_url: true,
    },
  });

  if (companies.length === 0) {
    console.log('  No hay empresas con logo o firma en DB.');
  }

  for (const company of companies) {
    // Logo
    if (company.logo_url) {
      const oldRelative = company.logo_url.replace(/^\//, '');
      const absoluteOld = path.join(BACKEND_ROOT, oldRelative);
      const originalName = path.basename(absoluteOld);

      const result = migrateFile(absoluteOld, 'company_logo', company.id);
      if (result) {
        const mediaId = await createMediaRecord(
          originalName, result.newFileName, getMimeType(absoluteOld),
          result.size, 'company_logo', 'company', company.id, result.storagePath,
        );
        if (!DRY_RUN) {
          await prisma.company.update({
            where: { id: company.id },
            data: { logo_url: `/api/media/${mediaId}` },
          });
        }
        results.push({
          category: 'company_logo', oldPath: company.logo_url,
          newPath: result.storagePath, mediaId, dbUpdated: `Company.logo_url (${company.nit})`,
        });
        console.log(`  Logo ${company.nit}: ${company.logo_url} → /api/media/${mediaId}`);
      }
    }

    // NOTA: Firma (legal_rep_signature_url) ahora está en tenant CompanySetting.
    // Las firmas existentes se migran con migrate-company-to-tenant-settings.ts
  }
}

// ─── Migration: Blog posts featured images ───────────────────

async function migrateBlogImages() {
  console.log('\n=== Migrando imágenes de blog ===');

  const posts = await prisma.blogPost.findMany({
    where: { featured_image: { not: null } },
    select: { id: true, slug: true, featured_image: true },
  });

  if (posts.length === 0) {
    console.log('  No hay blog posts con featured_image en DB.');
  }

  for (const post of posts) {
    const oldRelative = post.featured_image.replace(/^\//, '');
    const absoluteOld = path.join(BACKEND_ROOT, oldRelative);
    const originalName = path.basename(absoluteOld);

    const result = migrateFile(absoluteOld, 'blog_image', null);
    if (result) {
      const mediaId = await createMediaRecord(
        originalName, result.newFileName, getMimeType(absoluteOld),
        result.size, 'blog_image', 'public', null, result.storagePath,
      );
      if (!DRY_RUN) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { featured_image: `/api/media/${mediaId}` },
        });
      }
      results.push({
        category: 'blog_image', oldPath: post.featured_image,
        newPath: result.storagePath, mediaId, dbUpdated: `BlogPost.featured_image (${post.slug})`,
      });
      console.log(`  Blog ${post.slug}: ${post.featured_image} → /api/media/${mediaId}`);
    }
  }
}

// ─── Migration: Page og_image ────────────────────────────────

async function migratePageImages() {
  console.log('\n=== Migrando og_image de páginas ===');

  const pages = await prisma.page.findMany({
    where: { og_image: { not: null } },
    select: { id: true, slug: true, og_image: true },
  });

  if (pages.length === 0) {
    console.log('  No hay páginas con og_image en DB.');
  }

  for (const page of pages) {
    if (!page.og_image || !page.og_image.startsWith('/uploads/')) continue;

    const oldRelative = page.og_image.replace(/^\//, '');
    const absoluteOld = path.join(BACKEND_ROOT, oldRelative);
    const originalName = path.basename(absoluteOld);

    const result = migrateFile(absoluteOld, 'cms_image', null);
    if (result) {
      const mediaId = await createMediaRecord(
        originalName, result.newFileName, getMimeType(absoluteOld),
        result.size, 'cms_image', 'public', null, result.storagePath,
      );
      if (!DRY_RUN) {
        await prisma.page.update({
          where: { id: page.id },
          data: { og_image: `/api/media/${mediaId}` },
        });
      }
      results.push({
        category: 'cms_image', oldPath: page.og_image,
        newPath: result.storagePath, mediaId, dbUpdated: `Page.og_image (${page.slug})`,
      });
      console.log(`  Page ${page.slug}: ${page.og_image} → /api/media/${mediaId}`);
    }
  }
}

// ─── Migration: SiteSection JSON content with /uploads/ refs ─

async function migrateSiteSectionImages() {
  console.log('\n=== Migrando imágenes en SiteSection (JSON content) ===');

  const sections: any[] = await prisma.$queryRaw`
    SELECT id, section_key, section_type, content::text as content_text
    FROM site_sections
    WHERE content::text LIKE '%/uploads/%'
  `;

  if (sections.length === 0) {
    console.log('  No hay secciones con /uploads/ en content.');
    return;
  }

  // Regex para encontrar todas las URLs /uploads/...
  const uploadUrlRegex = /\/uploads\/[a-zA-Z0-9_\-/.]+\.[a-zA-Z0-9]+/g;

  for (const section of sections) {
    let contentStr = section.content_text;
    const matches = contentStr.match(uploadUrlRegex);
    if (!matches) continue;

    // Eliminar duplicados
    const uniqueUrls: string[] = [...new Set(matches)] as string[];
    console.log(`  Section "${section.section_key}" (${section.section_type}): ${uniqueUrls.length} archivos`);

    for (const oldUrl of uniqueUrls) {
      const oldRelative = oldUrl.replace(/^\//, '');
      const absoluteOld = path.join(BACKEND_ROOT, oldRelative);
      const originalName = path.basename(absoluteOld);

      const result = migrateFile(absoluteOld, 'cms_image', null);
      if (result) {
        const mediaId = await createMediaRecord(
          originalName, result.newFileName, getMimeType(absoluteOld),
          result.size, 'cms_image', 'public', null, result.storagePath,
        );

        // Reemplazar la URL vieja en el JSON
        contentStr = contentStr.split(oldUrl).join(`/api/media/${mediaId}`);

        results.push({
          category: 'cms_image', oldPath: oldUrl,
          newPath: result.storagePath, mediaId, dbUpdated: `SiteSection.content (${section.section_key})`,
        });
        console.log(`    ${oldUrl} → /api/media/${mediaId}`);
      }
    }

    // Actualizar el JSON en la DB
    if (!DRY_RUN) {
      await prisma.$executeRaw`
        UPDATE site_sections SET content = ${contentStr}::jsonb WHERE id = ${section.id}
      `;
    } else {
      console.log(`  [DRY-RUN] UPDATE site_sections SET content = ... WHERE id = ${section.id}`);
    }
  }
}

// ─── Migration: SiteSetting (favicon, og_image) ─────────────

async function migrateSiteSettings() {
  console.log('\n=== Migrando SiteSettings (favicon, og_image) ===');

  const settings = await prisma.siteSetting.findMany({
    where: {
      value: { contains: '/uploads/' },
    },
  });

  if (settings.length === 0) {
    console.log('  No hay site_settings con /uploads/ en value.');
    return;
  }

  for (const setting of settings) {
    const oldUrl = setting.value;
    const oldRelative = oldUrl.replace(/^\//, '');
    const absoluteOld = path.join(BACKEND_ROOT, oldRelative);
    const originalName = path.basename(absoluteOld);

    const result = migrateFile(absoluteOld, 'site_asset', null);
    if (result) {
      const mediaId = await createMediaRecord(
        originalName, result.newFileName, getMimeType(absoluteOld),
        result.size, 'site_asset', 'public', null, result.storagePath,
      );
      if (!DRY_RUN) {
        await prisma.siteSetting.update({
          where: { key: setting.key },
          data: { value: `/api/media/${mediaId}` },
        });
      }
      results.push({
        category: 'site_asset', oldPath: oldUrl,
        newPath: result.storagePath, mediaId, dbUpdated: `SiteSetting.value (${setting.key})`,
      });
      console.log(`  ${setting.key}: ${oldUrl} → /api/media/${mediaId}`);
    }
  }
}

// ─── Scan orphaned files ─────────────────────────────────────

function scanOrphanedFiles() {
  console.log('\n=== Escaneando archivos huérfanos en uploads/ ===');

  const oldDirs = ['cms', 'blog', 'logos', 'signatures', 'site', 'certificates'];
  const orphaned: string[] = [];

  for (const dir of oldDirs) {
    const dirPath = path.join(OLD_UPLOADS, dir);
    if (!fs.existsSync(dirPath)) continue;

    const walk = (d: string) => {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          orphaned.push(fullPath);
        }
      }
    };
    walk(dirPath);
  }

  if (orphaned.length === 0) {
    console.log('  No hay archivos huérfanos.');
    return;
  }

  console.log(`  ${orphaned.length} archivos en carpetas viejas:`);
  for (const f of orphaned) {
    const relative = path.relative(BACKEND_ROOT, f);
    // Check if this file was already migrated (by original path match)
    const wasMigrated = results.some((r) => {
      const normalizedOld = r.oldPath.replace(/^\//, '');
      return relative.replace(/\\/g, '/') === normalizedOld.replace(/\\/g, '/');
    });
    console.log(`    ${wasMigrated ? '[MIGRADO]' : '[HUERFANO]'} ${relative}`);
  }

  if (CLEANUP) {
    console.log('\n  --cleanup: Eliminando carpetas viejas...');
    for (const dir of oldDirs) {
      const dirPath = path.join(OLD_UPLOADS, dir);
      if (fs.existsSync(dirPath)) {
        if (DRY_RUN) {
          console.log(`    [DRY-RUN] rmdir: ${dirPath}`);
        } else {
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`    Eliminado: ${dir}/`);
        }
      }
    }
  } else {
    console.log('\n  Usa --cleanup para eliminar las carpetas viejas después de verificar.');
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Migración de uploads → media-service            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Backend root: ${BACKEND_ROOT}`);
  console.log(`Old uploads:  ${OLD_UPLOADS}`);
  console.log(`New uploads:  ${NEW_UPLOADS}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (sin cambios)' : 'REAL (escribiendo cambios)'}`);

  try {
    await migrateCompanyFiles();
    await migrateBlogImages();
    await migratePageImages();
    await migrateSiteSectionImages();
    await migrateSiteSettings();
    scanOrphanedFiles();

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  Resumen                                         ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`Archivos migrados: ${results.length}`);
    console.log(`Errores: ${errors.length}`);

    if (results.length > 0) {
      console.log('\nDetalle de migraciones:');
      for (const r of results) {
        console.log(`  [${r.category}] ${r.oldPath} → ${r.newPath} (DB: ${r.dbUpdated})`);
      }
    }

    if (errors.length > 0) {
      console.log('\nErrores:');
      for (const e of errors) {
        console.log(`  ${e}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
