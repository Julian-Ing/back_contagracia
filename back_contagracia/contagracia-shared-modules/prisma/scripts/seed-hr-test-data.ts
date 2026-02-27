/**
 * Script para crear datos de prueba de HR en los tenants
 * Crea: ThirdParty (empleados), EmployeeProfile, AttendanceRecords,
 *       EmployeeObservations, PerformanceEvaluations
 *
 * Uso:
 *   npx ts-node prisma/scripts/seed-hr-test-data.ts
 *   npx ts-node prisma/scripts/seed-hr-test-data.ts --force
 */

import { PrismaClient as MasterPrismaClient } from '@prisma/client-master';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import * as readline from 'readline';

const masterPrisma = new MasterPrismaClient();

interface Company {
  id: string;
  company_name: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
}

function buildDatabaseUrl(company: Company): string {
  return `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;
}

async function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ==================== DATOS DE PRUEBA ====================

const TEST_EMPLOYEES = [
  { name: 'Carlos Andrés Martínez López', doc: '1098765432', email: 'carlos.martinez@test.com' },
  { name: 'María Fernanda Rodríguez Gómez', doc: '1087654321', email: 'maria.rodriguez@test.com' },
  { name: 'Juan David Pérez Hernández', doc: '1076543210', email: 'juan.perez@test.com' },
  { name: 'Ana Lucía Torres Ramírez', doc: '1065432109', email: 'ana.torres@test.com' },
  { name: 'Diego Alejandro Vargas Castro', doc: '1054321098', email: 'diego.vargas@test.com' },
];

const OBSERVATION_TYPES = ['RECOGNITION', 'FEEDBACK', 'INCIDENT', 'WARNING', 'ACHIEVEMENT', 'CONCERN'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

const OBSERVATION_TEMPLATES = [
  { type: 'RECOGNITION', severity: 'MEDIUM', title: 'Excelente atención al cliente', description: 'El empleado recibió múltiples felicitaciones de clientes por su servicio excepcional.' },
  { type: 'ACHIEVEMENT', severity: 'HIGH', title: 'Superó meta trimestral en 120%', description: 'Alcanzó y superó significativamente los objetivos establecidos para el trimestre.' },
  { type: 'FEEDBACK', severity: 'LOW', title: 'Retroalimentación sobre trabajo en equipo', description: 'Se recomienda mejorar la comunicación con el equipo de desarrollo durante los sprints.' },
  { type: 'INCIDENT', severity: 'HIGH', title: 'Llegada tarde recurrente', description: 'Se han registrado 5 llegadas tarde en las últimas 2 semanas sin justificación.' },
  { type: 'WARNING', severity: 'HIGH', title: 'Uso inadecuado de recursos', description: 'Se detectó uso de equipos de la empresa para fines personales durante horario laboral.' },
  { type: 'CONCERN', severity: 'MEDIUM', title: 'Baja productividad últimas semanas', description: 'Se observa una disminución en la productividad comparado con meses anteriores.' },
  { type: 'RECOGNITION', severity: 'HIGH', title: 'Liderazgo en proyecto crítico', description: 'Tomó la iniciativa y lideró exitosamente el proyecto de migración de datos.' },
  { type: 'ACHIEVEMENT', severity: 'MEDIUM', title: 'Certificación profesional obtenida', description: 'Completó exitosamente la certificación PMP durante este periodo.' },
  { type: 'FEEDBACK', severity: 'MEDIUM', title: 'Mejorar documentación de procesos', description: 'Se sugiere documentar mejor los procesos que maneja para facilitar la continuidad.' },
  { type: 'INCIDENT', severity: 'MEDIUM', title: 'Conflicto con compañero de trabajo', description: 'Se presentó un altercado verbal con un compañero durante una reunión de equipo.' },
  { type: 'RECOGNITION', severity: 'LOW', title: 'Colaboración con nuevo integrante', description: 'Ayudó activamente en la inducción del nuevo miembro del equipo.' },
  { type: 'CONCERN', severity: 'LOW', title: 'Falta de participación en reuniones', description: 'Se ha notado poca participación activa en las reuniones semanales de equipo.' },
];

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(0, 0, 0, 0);
  return d;
}

function randomCheckIn(): Date {
  const d = new Date();
  // Between 7:30 and 9:00
  const hour = 7 + Math.floor(Math.random() * 2);
  const min = Math.floor(Math.random() * 60);
  d.setHours(hour, min, 0, 0);
  return d;
}

function randomCheckOut(checkIn: Date): Date {
  const d = new Date(checkIn);
  // Work 7-9 hours
  const hours = 7 + Math.floor(Math.random() * 3);
  d.setHours(d.getHours() + hours, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

// ==================== SEED FUNCTION ====================

async function seedHrTestData(tenantPrisma: TenantPrismaClient, companyName: string) {
  console.log(`\n  📋 Seeding HR test data for "${companyName}"...`);

  // 1. Find first admin user (evaluator/creator)
  const adminUser = await tenantPrisma.tenantUser.findFirst({
    where: { is_active: true },
    orderBy: { created_at: 'asc' },
  });

  if (!adminUser) {
    console.log('    ⚠️  No admin user found, skipping...');
    return;
  }

  // 2. Find or get document type (CC - Cédula de Ciudadanía)
  const docType = await tenantPrisma.typeDocumentIdentification.findFirst({
    where: { OR: [{ code: '13' }, { name: { contains: 'Cédula', mode: 'insensitive' } }] },
  });

  // 3. Create ThirdParty + EmployeeProfile for each test employee
  const profiles: { id: string; thirdPartyId: string; name: string }[] = [];

  for (const emp of TEST_EMPLOYEES) {
    // Check if already exists
    const existing = await tenantPrisma.thirdParty.findFirst({
      where: { identification_number: emp.doc },
    });

    if (existing) {
      const profile = await tenantPrisma.employeeProfile.findFirst({
        where: { third_party_id: existing.id },
      });
      if (profile) {
        profiles.push({ id: profile.id, thirdPartyId: existing.id, name: emp.name });
        console.log(`    ✅ ${emp.name} ya existe (profile: ${profile.id})`);
        continue;
      }
    }

    const thirdParty = await tenantPrisma.thirdParty.create({
      data: {
        name: emp.name,
        identification_number: emp.doc,
        type_document_identification_id: docType?.id,
        email: emp.email,
        roles: ['EMPLOYEE'],
        employee_status: 'ACTIVE',
        hire_date: new Date('2024-01-15'),
        created_by: adminUser.id,
      },
    });

    const profile = await tenantPrisma.employeeProfile.create({
      data: {
        third_party_id: thirdParty.id,
        employee_code: `EMP-${emp.doc.slice(-4)}`,
        hire_date: new Date('2024-01-15'),
        employee_status: 'ACTIVE',
      },
    });

    profiles.push({ id: profile.id, thirdPartyId: thirdParty.id, name: emp.name });
    console.log(`    ✅ Creado: ${emp.name} (profile: ${profile.id})`);
  }

  // 4. Create attendance records (last 90 days, weekdays only)
  console.log('    📅 Creando registros de asistencia...');
  let attendanceCount = 0;

  for (const profile of profiles) {
    for (let daysAgo = 1; daysAgo <= 90; daysAgo++) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0);

      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // 90% attendance probability
      const isPresent = Math.random() < 0.9;
      if (!isPresent) continue;

      // Check if already exists
      const existing = await tenantPrisma.attendanceRecord.findFirst({
        where: { employee_profile_id: profile.id, date },
      });
      if (existing) continue;

      const checkIn = new Date(date);
      const hour = 7 + Math.floor(Math.random() * 2); // 7-8 AM
      const min = Math.floor(Math.random() * 60);
      checkIn.setHours(hour, min, 0, 0);

      const workedHours = 7 + Math.random() * 2; // 7-9 hours

      const checkOut = new Date(checkIn);
      checkOut.setHours(checkIn.getHours() + Math.floor(workedHours), Math.floor((workedHours % 1) * 60), 0, 0);

      await tenantPrisma.attendanceRecord.create({
        data: {
          employee_profile_id: profile.id,
          date,
          check_in: checkIn,
          check_out: checkOut,
          worked_hours: Number(workedHours.toFixed(2)),
        },
      });
      attendanceCount++;
    }
  }
  console.log(`    ✅ ${attendanceCount} registros de asistencia creados`);

  // 5. Create employee observations (random distribution)
  console.log('    📝 Creando observaciones...');
  let obsCount = 0;

  for (const profile of profiles) {
    // 3-6 observations per employee
    const numObs = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numObs; i++) {
      const template = OBSERVATION_TEMPLATES[Math.floor(Math.random() * OBSERVATION_TEMPLATES.length)];
      const obsDate = randomDate(90);

      await tenantPrisma.employeeObservation.create({
        data: {
          employee_profile_id: profile.id,
          title: template.title,
          description: template.description,
          observation_date: obsDate,
          observation_type: template.type as any,
          severity: template.severity as any,
          status: Math.random() > 0.3 ? 'ACTIVE' : 'RESOLVED',
          action_required: template.type === 'INCIDENT' || template.type === 'WARNING'
            ? 'Programar reunión de seguimiento con el empleado'
            : null,
          follow_up_date: (template.type === 'INCIDENT' || template.type === 'CONCERN')
            ? (() => { const d = new Date(obsDate); d.setDate(d.getDate() + 14); return d; })()
            : null,
          created_by_id: adminUser.id,
        },
      });
      obsCount++;
    }
  }
  console.log(`    ✅ ${obsCount} observaciones creadas`);

  // 6. Create performance evaluations (1-2 per employee)
  console.log('    📊 Creando evaluaciones de desempeño...');
  let evalCount = 0;

  const periods = ['2025-Q4', '2026-Q1'];

  for (const profile of profiles) {
    for (const period of periods) {
      // Check if already exists
      const existing = await tenantPrisma.performanceEvaluation.findFirst({
        where: { employee_profile_id: profile.id, evaluation_period: period },
      });
      if (existing) continue;

      const attScore = 2 + Math.floor(Math.random() * 4); // 2-5
      const perfScore = 2 + Math.floor(Math.random() * 4);
      const attitScore = 2 + Math.floor(Math.random() * 4);
      const overall = Number((attScore * 0.3 + perfScore * 0.5 + attitScore * 0.2).toFixed(2));

      await tenantPrisma.performanceEvaluation.create({
        data: {
          employee_profile_id: profile.id,
          evaluation_period: period,
          evaluation_date: period === '2025-Q4' ? new Date('2025-12-15') : new Date('2026-01-31'),
          attendance_score: attScore,
          performance_score: perfScore,
          attitude_score: attitScore,
          overall_score: overall,
          strengths: attScore >= 4 ? 'Excelente asistencia y puntualidad.' : 'Cumple con horarios de forma aceptable.',
          areas_for_improvement: perfScore < 4 ? 'Mejorar productividad y cumplimiento de metas.' : 'Continuar con el buen rendimiento.',
          goals_next_period: 'Alcanzar 95% de asistencia. Mantener comunicación activa con supervisor.',
          evaluator_comments: `Evaluación del periodo ${period}. Score general: ${overall}/5.`,
          evaluator_id: adminUser.id,
          status: period === '2025-Q4' ? 'APPROVED' : 'DRAFT',
        },
      });
      evalCount++;
    }
  }
  console.log(`    ✅ ${evalCount} evaluaciones creadas`);

  console.log(`  ✅ HR test data completo para "${companyName}"`);
}

// ==================== MAIN ====================

async function main() {
  const args = process.argv.slice(2);
  const isForce = args.includes('--force');

  console.log('🚀 Seed HR Test Data - Datos de prueba para módulos HR\n');

  const companies = await masterPrisma.company.findMany({
    where: { is_active: true },
    select: {
      id: true,
      company_name: true,
      db_host: true,
      db_port: true,
      db_name: true,
      db_user: true,
      db_password: true,
    },
  }) as Company[];

  if (companies.length === 0) {
    console.log('⚠️  No hay empresas activas en la base de datos master');
    process.exit(0);
  }

  console.log(`📦 Empresas activas encontradas: ${companies.length}`);
  for (const c of companies) {
    console.log(`   - ${c.company_name} (${c.db_name})`);
  }

  if (!isForce) {
    const confirmed = await askConfirmation('\n¿Deseas continuar? (y/N): ');
    if (!confirmed) {
      console.log('❌ Cancelado');
      process.exit(0);
    }
  }

  for (const company of companies) {
    const dbUrl = buildDatabaseUrl(company);
    const tenantPrisma = new TenantPrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    try {
      await tenantPrisma.$connect();
      await seedHrTestData(tenantPrisma, company.company_name);
    } catch (error: any) {
      console.error(`  ❌ Error en "${company.company_name}": ${error.message}`);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  await masterPrisma.$disconnect();
  console.log('\n🎉 ¡Seed HR completado!');
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
