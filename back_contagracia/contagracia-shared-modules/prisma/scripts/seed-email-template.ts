/**
 * Script para insertar una plantilla de email de prueba en un tenant
 *
 * Uso:
 *   npx ts-node --transpile-only prisma/scripts/seed-email-template.ts
 */

import { PrismaClient as MasterPrisma } from '@prisma/client-master';
import { PrismaClient as TenantPrisma } from '@prisma/client-tenant';

const COMPANY_ID = '3e6bc20b-467c-46d4-810b-787e0f356419';

async function main() {
  const masterPrisma = new MasterPrisma();

  // 1. Obtener info de conexión del tenant
  const company = await masterPrisma.company.findUnique({
    where: { id: COMPANY_ID },
    select: {
      id: true,
      company_name: true,
      db_host: true,
      db_port: true,
      db_name: true,
      db_user: true,
      db_password: true,
    },
  });

  if (!company) {
    console.error('❌ Empresa no encontrada');
    process.exit(1);
  }

  console.log(`📊 Conectando a tenant: ${company.company_name} (${company.db_name})`);

  // 2. Conectar al tenant
  const tenantUrl = `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;

  const tenantPrisma = new TenantPrisma({
    datasources: {
      db: { url: tenantUrl },
    },
  });

  await tenantPrisma.$connect();

  // 3. Insertar plantillas de email
  const emailTemplates = [
    {
      name: 'Bienvenida Prospección',
      subject: '¡Bienvenido a {{company_name}}!',
      body_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">¡Hola {{contact_name}}!</h2>
          <p>Gracias por tu interés en nuestros servicios. Un asesor se pondrá en contacto contigo pronto.</p>
          <p>Mientras tanto, si tienes alguna pregunta, no dudes en escribirnos.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Equipo {{company_name}}<br>
            Este es un email automático, por favor no responder directamente.
          </p>
        </div>
      `,
      variables: JSON.stringify(['contact_name', 'company_name']),
      is_active: true,
    },
    {
      name: 'Seguimiento Negociación',
      subject: 'Continuemos con tu propuesta - {{opportunity_name}}',
      body_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Hola {{contact_name}}</h2>
          <p>Queremos darte seguimiento a la propuesta que hemos estado trabajando.</p>
          <p><strong>Oportunidad:</strong> {{opportunity_name}}</p>
          <p>¿Tienes alguna pregunta o necesitas más información?</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">Saludos cordiales,<br>{{owner_name}}</p>
        </div>
      `,
      variables: JSON.stringify(['contact_name', 'opportunity_name', 'owner_name']),
      is_active: true,
    },
    {
      name: 'Felicitación Cierre',
      subject: '🎉 ¡Bienvenido a la familia {{company_name}}!',
      body_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10B981;">🎉 ¡Felicidades {{contact_name}}!</h2>
          <p>Estamos muy contentos de que hayas decidido confiar en nosotros.</p>
          <p>Tu asesor {{owner_name}} estará en contacto contigo para los siguientes pasos.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Bienvenido a {{company_name}}
          </p>
        </div>
      `,
      variables: JSON.stringify(['contact_name', 'owner_name', 'company_name']),
      is_active: true,
    },
  ];

  console.log('📧 Insertando plantillas de email...');

  for (const template of emailTemplates) {
    const created = await tenantPrisma.emailTemplate.create({
      data: template,
    });
    console.log(`  ✅ ${created.name} (ID: ${created.id})`);
  }

  // 4. Cleanup
  await tenantPrisma.$disconnect();
  await masterPrisma.$disconnect();

  console.log('\n✅ Plantillas creadas exitosamente!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
