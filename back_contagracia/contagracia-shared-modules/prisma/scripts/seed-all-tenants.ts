/**
 * Script para aplicar seeds de catálogos a TODAS las bases de datos de tenants
 *
 * Uso:
 *   npx ts-node prisma/scripts/seed-all-tenants.ts
 *
 * Opciones:
 *   --dry-run              Solo muestra qué haría, sin ejecutar
 *   --force                No pide confirmación
 *   --catalogs             Solo seedea catálogos DIAN (departments, municipalities, etc.)
 *   --company-id=<uuid>    Solo seedea la tenant de la empresa especificada
 */

import { PrismaClient as MasterPrismaClient } from '@prisma/client-master';
import { PrismaClient as TenantPrismaClient, Prisma } from '@prisma/client-tenant';
import * as readline from 'readline';
import { companyPaymentMethods } from '../seeds/companyPaymentMethods';
import { expenseCategories } from '../seeds/expenseCategories';
import { crmOpportunityStages } from '../seeds/crmOpportunityStages';
import { exogenousFormats } from '../seeds/exogenousFormats';
import { exogenousConcepts } from '../seeds/exogenousConcepts';
import { PAYROLL_CONCEPTS } from '../seeds/seed-payroll-concepts';
import { PAYROLL_WITHHOLDING_UVT } from '../seeds/seed-payroll-withholding-uvt';
import { companySettings } from '../seeds/companySettings';
import { socialSecurityEntities } from '../seeds/socialSecurityEntities';
import { bankAccounts } from '../seeds/bankAccounts';
import { taxes as taxesSeed } from '../seeds/taxes';
import { typeDocuments as typeDocumentsSeed } from '../seeds/typeDocuments';
import { costCenterMovementTypes } from '../seeds/costCenterMovementTypes';
import { costCenterMovementReferenceTypes } from '../seeds/costCenterMovementReferenceTypes';
import { seedPhResidentRole } from './seed-ph-roles';
import { aiuCategory, aiuProducts } from '../seeds/aiuProducts';
import { bagCategory, bagProducts } from '../seeds/bagProducts';

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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Crea los roles de sistema (owner, admin) si no existen
 */
async function seedTenantRoles(tenantPrisma: TenantPrismaClient) {
  let created = 0;

  // Rol owner
  const existingOwner = await tenantPrisma.role.findFirst({
    where: { role_key: 'owner' },
  });
  if (!existingOwner) {
    await tenantPrisma.role.create({
      data: {
        role_key: 'owner',
        role_name: 'Propietario',
        description: 'Propietario de la empresa con todos los permisos',
        is_system: true,
      },
    });
    created++;
  }

  // Rol admin
  const existingAdmin = await tenantPrisma.role.findFirst({
    where: { role_key: 'admin' },
  });
  if (!existingAdmin) {
    await tenantPrisma.role.create({
      data: {
        role_key: 'admin',
        role_name: 'Administrador',
        description: 'Administrador de la empresa con todos los permisos',
        is_system: true,
      },
    });
    created++;
  }

  return { rolesCreated: created };
}

/**
 * Copia las tablas paramétricas de Master a un Tenant
 */
async function seedTenantModules(tenantPrisma: TenantPrismaClient, companyId: string) {
  // Obtener la suscripción activa de la empresa para saber qué plan tiene
  const subscription = await masterPrisma.subscription.findFirst({
    where: {
      company_id: companyId,
      OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
    },
    include: {
      plan: {
        include: {
          plan_modules: {
            include: {
              module: {
                include: { actions: true },
              },
            },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!subscription) {
    console.log('    ⚠️ Sin suscripción activa, saltando módulos');
    return { modules: 0, actions: 0 };
  }

  const planModules = subscription.plan.plan_modules.map((pm) => pm.module);
  const planActions = planModules.flatMap((m) => m.actions);
  const moduleKeys = planModules.map((m) => m.module_key);

  // Eliminar módulos que ya no están en el plan (cascade borra acciones)
  await tenantPrisma.module.deleteMany({
    where: { module_key: { notIn: moduleKeys } },
  });

  // Eliminar acciones huérfanas que ya no están en Master
  const actionIds = planActions.map((a) => a.id);
  await tenantPrisma.systemAction.deleteMany({
    where: { id: { notIn: actionIds } },
  });

  // Upsert módulos
  for (const m of planModules) {
    await tenantPrisma.module.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        module_key: m.module_key,
        module_name: m.module_name,
        description: m.description,
        icon: m.icon,
        group: m.group,
        sort_order: m.sort_order,
        is_active: m.is_active,
      },
      update: {
        module_name: m.module_name,
        description: m.description,
        icon: m.icon,
        group: m.group,
        sort_order: m.sort_order,
        is_active: m.is_active,
      },
    });
  }

  // Upsert acciones
  for (const a of planActions) {
    await tenantPrisma.systemAction.upsert({
      where: { id: a.id },
      create: {
        id: a.id,
        module_id: a.module_id,
        action_key: a.action_key,
        action_name: a.action_name,
        description: a.description,
        is_active: a.is_active,
      },
      update: {
        action_key: a.action_key,
        action_name: a.action_name,
        description: a.description,
        is_active: a.is_active,
      },
    });
  }

  return { modules: planModules.length, actions: planActions.length };
}

/**
 * Asigna TODOS los permisos disponibles a los roles de sistema (owner, admin)
 * Esta funcion es CRITICA - sin ella, los usuarios no tienen permisos asignados
 */
async function seedDefaultRolePermissions(tenantPrisma: TenantPrismaClient) {
  let created = 0;

  // Obtener roles de sistema
  const systemRoles = await tenantPrisma.role.findMany({
    where: { role_key: { in: ['owner', 'admin'] } },
  });

  if (systemRoles.length === 0) {
    console.log('    ⚠️ No system roles found, skipping permissions');
    return { permissionsCreated: 0 };
  }

  // Obtener todas las acciones disponibles en el tenant
  const allActions = await tenantPrisma.systemAction.findMany({
    where: { is_active: true },
  });

  if (allActions.length === 0) {
    console.log('    ⚠️ No actions found, skipping permissions');
    return { permissionsCreated: 0 };
  }

  // Para cada rol de sistema, asignar TODAS las acciones
  for (const role of systemRoles) {
    for (const action of allActions) {
      try {
        await tenantPrisma.rolePermission.upsert({
          where: {
            role_id_action_key: {
              role_id: role.id,
              action_key: action.action_key,
            },
          },
          update: { granted: true },
          create: {
            role_id: role.id,
            action_key: action.action_key,
            granted: true,
          },
        });
        created++;
      } catch (error) {
        // Ignorar errores de duplicados
      }
    }
  }

  return { permissionsCreated: created };
}

/**
 * Migra datos de perfil desde _company_profile_staging (master) → CompanySetting (tenant).
 * La tabla staging la crea la migración 20260227003028 ANTES de dropear columnas de companies.
 * Si la tabla no existe (migración no aplicada aún), es no-op.
 * Si CompanySetting ya tiene el dato, NO lo sobrescribe.
 */
async function seedCompanyProfileSettings(tenantPrisma: TenantPrismaClient, companyId: string) {
  // Read from staging table in master
  let staging: any[];
  try {
    staging = await masterPrisma.$queryRaw`
      SELECT * FROM "_company_profile_staging" WHERE company_id = ${companyId}
    `;
  } catch {
    // Staging table doesn't exist (migration not applied yet) — skip
    return { profileSettings: 0 };
  }

  if (!staging || staging.length === 0) {
    return { profileSettings: 0 };
  }

  const row = staging[0];
  let written = 0;

  // Map staging columns → CompanySetting (category:key = value)
  const mappings: { category: string; key: string; value: string | null }[] = [
    // company_info
    { category: 'company_info', key: 'dv', value: row.dv },
    { category: 'company_info', key: 'phone', value: row.phone },
    { category: 'company_info', key: 'address', value: row.address },
    { category: 'company_info', key: 'whatsapp_number', value: row.whatsapp_number },
    { category: 'company_info', key: 'country_id', value: row.country_id },
    { category: 'company_info', key: 'department_id', value: row.department_id },
    { category: 'company_info', key: 'municipality_id', value: row.municipality_id },
    // tax_classification
    { category: 'tax_classification', key: 'type_document_identification_id', value: row.type_document_identification_id },
    { category: 'tax_classification', key: 'type_organization_id', value: row.type_organization_id },
    { category: 'tax_classification', key: 'type_regime_id', value: row.type_regime_id },
    { category: 'tax_classification', key: 'type_liability_id', value: row.type_liability_id },
    // legal_representative
    { category: 'legal_representative', key: 'name', value: row.legal_rep_name },
    { category: 'legal_representative', key: 'identification', value: row.legal_rep_identification },
    { category: 'legal_representative', key: 'email', value: row.legal_rep_email },
    { category: 'legal_representative', key: 'phone', value: row.legal_rep_phone },
    { category: 'legal_representative', key: 'signature_url', value: row.legal_rep_signature_url },
  ];

  for (const m of mappings) {
    if (m.value === null || m.value === undefined || m.value === '') continue;

    await tenantPrisma.companySetting.upsert({
      where: { category_key: { category: m.category, key: m.key } },
      create: {
        category: m.category,
        key: m.key,
        value: String(m.value),
        value_type: 'string',
        is_readonly: false,
      },
      update: {}, // Don't overwrite if user already edited
    });
    written++;
  }

  return { profileSettings: written };
}

async function seedTenantCatalogs(tenantPrisma: TenantPrismaClient) {
  // Obtener datos de Master
  const [
    departments,
    typeDocumentIdentifications,
    typeOrganizations,
    typeRegimes,
    typeLiabilities,
    banks,
    paymentMethods,
    productUnits,
    taxTypes,
    taxes,
    arlRisks,
    typeWorkers,
    subTypeWorkers,
    typeContracts,
    events,
    typeDocuments,
    typeRejections,
    typePayrollAdjustNotes,
    workerSubtypeRules,
    taxObligationTypes,
    chartOfAccounts,
    accountingConfigs,
    journalEntryTypes,
    bankMovementTypes,
    arApSources,
    consecutiveTypes,
    productMovementTypes,
    bankAdjustmentTypes,
    typeOperations,
  ] = await Promise.all([
    masterPrisma.department.findMany({ include: { municipalities: true } }),
    masterPrisma.typeDocumentIdentification.findMany(),
    masterPrisma.typeOrganization.findMany(),
    masterPrisma.typeRegime.findMany(),
    masterPrisma.typeLiability.findMany(),
    masterPrisma.bank.findMany(),
    masterPrisma.paymentMethod.findMany(),
    masterPrisma.productUnit.findMany(),
    masterPrisma.taxType.findMany(),
    masterPrisma.tax.findMany(),
    masterPrisma.arlRisk.findMany(),
    masterPrisma.typeWorker.findMany(),
    masterPrisma.subTypeWorker.findMany(),
    masterPrisma.typeContract.findMany(),
    masterPrisma.event.findMany(),
    Promise.resolve(typeDocumentsSeed),
    masterPrisma.typeRejection.findMany(),
    masterPrisma.typePayrollAdjustNote.findMany(),
    masterPrisma.workerSubtypeRule.findMany(),
    masterPrisma.taxObligationType.findMany(),
    masterPrisma.chartOfAccount.findMany(),
    masterPrisma.accountingConfig.findMany(),
    masterPrisma.journalEntryType.findMany(),
    masterPrisma.bankMovementType.findMany(),
    masterPrisma.arApSource.findMany(),
    masterPrisma.consecutiveType.findMany(),
    masterPrisma.productMovementType.findMany(),
    masterPrisma.bankAdjustmentType.findMany(),
    masterPrisma.typeOperation.findMany(),
  ]);

  // Insertar en Tenant (upsert para no duplicar)
  let counts = { departments: 0, municipalities: 0, docTypes: 0, orgs: 0, regimes: 0, liabilities: 0, banks: 0, paymentMethods: 0, productUnits: 0, taxTypes: 0, taxes: 0, arlRisks: 0, typeWorkers: 0, subTypeWorkers: 0, typeContracts: 0, events: 0, typeDocuments: 0, typeRejections: 0, typePayrollAdjustNotes: 0, workerSubtypeRules: 0, taxObligationTypes: 0, chartOfAccounts: 0, accountingConfigs: 0, journalEntryTypes: 0, bankMovementTypes: 0, arApSources: 0, companyPaymentMethods: 0, consecutiveTypes: 0, consecutives: 0, productMovementTypes: 0, bankAdjustmentTypes: 0, expenseCategories: 0, aiuCategory: 0, aiuProducts: 0, bagCategory: 0, bagProducts: 0, exogenousFormats: 0, exogenousConcepts: 0, crmOpportunityStages: 0, companySettings: 0, socialSecurityEntities: 0, payrollConcepts: 0, payrollWithholdingUvt: 0, bankAccounts: 0, costCenterMovementTypes: 0, costCenterMovementReferenceTypes: 0, typeOperations: 0 };

  // Type Document Identifications
  for (const item of typeDocumentIdentifications) {
    await tenantPrisma.typeDocumentIdentification.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description },
      create: { id: item.id, code: item.code, name: item.name, description: item.description },
    });
    counts.docTypes++;
  }

  // Type Organizations
  for (const item of typeOrganizations) {
    await tenantPrisma.typeOrganization.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description },
      create: { id: item.id, code: item.code, name: item.name, description: item.description },
    });
    counts.orgs++;
  }

  // Type Regimes
  for (const item of typeRegimes) {
    await tenantPrisma.typeRegime.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description },
      create: { id: item.id, code: item.code, name: item.name, description: item.description },
    });
    counts.regimes++;
  }

  // Type Liabilities
  for (const item of typeLiabilities) {
    await tenantPrisma.typeLiability.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description, category: item.category },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
      },
    });
    counts.liabilities++;
  }

  // Banks
  for (const item of banks) {
    await tenantPrisma.bank.upsert({
      where: { code: item.code },
      update: { name: item.name, country: item.country, swift_code: item.swift_code, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        country: item.country,
        swift_code: item.swift_code,
        is_active: item.is_active,
      },
    });
    counts.banks++;
  }

  // Payment Methods
  for (const item of paymentMethods) {
    await tenantPrisma.paymentMethod.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        is_active: item.is_active,
      },
    });
    counts.paymentMethods++;
  }

  // Product Units
  for (const item of productUnits) {
    await tenantPrisma.productUnit.upsert({
      where: { id: item.id },
      update: { name: item.name, description: item.description, is_active: item.is_active },
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        is_active: item.is_active,
      },
    });
    counts.productUnits++;
  }

  // Chart of Accounts (PUC base) - DEBE ir antes de Taxes y AccountingConfigs por FK
  const sortedAccounts = [...chartOfAccounts].sort((a, b) => {
    const lenDiff = a.code.length - b.code.length;
    if (lenDiff !== 0) return lenDiff;
    return a.code.localeCompare(b.code);
  });

  for (const item of sortedAccounts) {
    await tenantPrisma.chartOfAccount.upsert({
      where: { code: item.code },
      update: { name: item.name, type: item.type, parent_code: item.parent_code ?? undefined, is_active: item.is_active },
      create: {
        code: item.code,
        name: item.name,
        type: item.type,
        parent_code: item.parent_code ?? undefined,
        is_active: item.is_active,
      },
    });
    counts.chartOfAccounts++;
  }

  // Accounting Configs (después de PUC para que existan las cuentas)
  for (const item of accountingConfigs) {
    await tenantPrisma.accountingConfig.upsert({
      where: { key: item.key },
      update: {
        description: item.description,
        account_code: item.account_code ?? undefined,
        default: item.default ?? undefined,
      },
      create: {
        key: item.key,
        description: item.description,
        account_code: item.account_code ?? undefined,
        default: item.default ?? undefined,
      },
    });
    counts.accountingConfigs++;
  }

  // Tax Types (debe ir antes de Taxes por FK)
  for (const item of taxTypes) {
    await tenantPrisma.taxType.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description, is_tax: item.is_tax, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        is_tax: item.is_tax,
        is_active: item.is_active,
      },
    });
    counts.taxTypes++;
  }

  // Taxes (usar seed file para incluir cuentas contables)
  for (const item of taxesSeed) {
    await tenantPrisma.tax.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        rate: item.rate,
        per_unit_amount: (item as any).per_unit_amount || null,
        tax_type_id: item.tax_type_id,
        description: (item as any).description,
        is_system: (item as any).is_system ?? false,
        is_active: (item as any).is_active,
        tax_sales_account_code: (item as any).tax_sales_account_code || null,
        tax_purchases_account_code: (item as any).tax_purchases_account_code || null,
        tax_cost_account_code: (item as any).tax_cost_account_code || null,
        withholding_sales_account_code: (item as any).withholding_sales_account_code || null,
        withholding_purchases_account_code: (item as any).withholding_purchases_account_code || null,
      },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        rate: item.rate,
        per_unit_amount: (item as any).per_unit_amount || null,
        tax_type_id: item.tax_type_id,
        description: (item as any).description,
        is_system: (item as any).is_system ?? false,
        is_active: (item as any).is_active,
        tax_sales_account_code: (item as any).tax_sales_account_code || null,
        tax_purchases_account_code: (item as any).tax_purchases_account_code || null,
        tax_cost_account_code: (item as any).tax_cost_account_code || null,
        withholding_sales_account_code: (item as any).withholding_sales_account_code || null,
        withholding_purchases_account_code: (item as any).withholding_purchases_account_code || null,
      },
    });
    counts.taxes++;
  }

  // Departments y Municipalities
  for (const dept of departments) {
    await tenantPrisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, country_id: dept.country_id },
      create: { id: dept.id, code: dept.code, name: dept.name, country_id: dept.country_id },
    });
    counts.departments++;

    for (const muni of dept.municipalities) {
      await tenantPrisma.municipality.upsert({
        where: { code: muni.code },
        update: { name: muni.name, dian_code: muni.dian_code },
        create: {
          id: muni.id,
          code: muni.code,
          name: muni.name,
          department_id: dept.id,
          dian_code: muni.dian_code,
        },
      });
      counts.municipalities++;
    }
  }

  // ARL Risks
  for (const item of arlRisks) {
    await tenantPrisma.arlRisk.upsert({
      where: { code: item.code },
      update: { name: item.name, rate: item.rate, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        rate: item.rate,
        is_active: item.is_active,
      },
    });
    counts.arlRisks++;
  }

  // Type Workers
  for (const item of typeWorkers) {
    await tenantPrisma.typeWorker.upsert({
      where: { code: item.code },
      update: { name: item.name, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        is_active: item.is_active,
      },
    });
    counts.typeWorkers++;
  }

  // Sub Type Workers
  for (const item of subTypeWorkers) {
    await tenantPrisma.subTypeWorker.upsert({
      where: { code: item.code },
      update: { name: item.name, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        is_active: item.is_active,
      },
    });
    counts.subTypeWorkers++;
  }

  // Type Contracts
  for (const item of typeContracts) {
    await tenantPrisma.typeContract.upsert({
      where: { code: item.code },
      update: { name: item.name, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        is_active: item.is_active,
      },
    });
    counts.typeContracts++;
  }

  // Events (RADIAN)
  for (const item of events) {
    await tenantPrisma.event.upsert({
      where: { code: item.code },
      update: { name: item.name, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        is_active: item.is_active,
      },
    });
    counts.events++;
  }

  // Type Operations (DIAN)
  for (const item of typeOperations) {
    await tenantPrisma.typeOperation.upsert({
      where: { code: item.code },
      update: { name: item.name, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        is_active: item.is_active,
      },
    });
    counts.typeOperations++;
  }

  // Type Documents (DIAN)
  for (const item of typeDocuments) {
    await tenantPrisma.typeDocument.upsert({
      where: { code: item.code },
      update: { name: item.name, cufe_algorithm: item.cufe_algorithm, prefix: item.prefix, display_order: item.display_order, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        cufe_algorithm: item.cufe_algorithm,
        prefix: item.prefix,
        display_order: item.display_order,
        is_active: item.is_active,
      },
    });
    counts.typeDocuments++;
  }

  // Type Rejections (DIAN)
  for (const item of typeRejections) {
    await tenantPrisma.typeRejection.upsert({
      where: { code: item.code },
      update: { name: item.name, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        is_active: item.is_active,
      },
    });
    counts.typeRejections++;
  }

  // Type Payroll Adjust Notes
  for (const item of typePayrollAdjustNotes) {
    await tenantPrisma.typePayrollAdjustNote.upsert({
      where: { code: item.code },
      update: { name: item.name, is_active: item.is_active },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        is_active: item.is_active,
      },
    });
    counts.typePayrollAdjustNotes++;
  }

  // Worker Subtype Rules
  for (const item of workerSubtypeRules) {
    await tenantPrisma.workerSubtypeRule.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        sub_type_worker_id: item.sub_type_worker_id,
        health_employee_rate: item.health_employee_rate,
        health_employer_rate: item.health_employer_rate,
        pension_employee_rate: item.pension_employee_rate,
        pension_employer_rate: item.pension_employer_rate,
        health_employee_pays: item.health_employee_pays,
        pension_employee_pays: item.pension_employee_pays,
        ccf_applies: item.ccf_applies,
        icbf_applies: item.icbf_applies,
        sena_applies: item.sena_applies,
        arl_applies: item.arl_applies,
        fsp_applies: item.fsp_applies,
        fsp_special_rate: item.fsp_special_rate,
        ibc_min_smmlv_percentage: item.ibc_min_smmlv_percentage,
        legal_notes: item.legal_notes,
        ui_display_name: item.ui_display_name,
        ui_impacts: item.ui_impacts ?? Prisma.JsonNull,
        ui_color: item.ui_color,
        is_active: item.is_active,
      },
    });
    counts.workerSubtypeRules++;
  }

  // Tax Obligation Types
  for (const item of taxObligationTypes) {
    await tenantPrisma.taxObligationType.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        periodicity: item.periodicity,
        nit_digit_type: item.nit_digit_type,
        applies_to_gran_contribuyente: item.applies_to_gran_contribuyente,
        applies_to_persona_juridica: item.applies_to_persona_juridica,
        applies_to_persona_natural: item.applies_to_persona_natural,
        applies_to_rst: item.applies_to_rst,
        has_multiple_installments: item.has_multiple_installments,
        installment_count: item.installment_count,
        display_order: item.display_order,
        is_active: item.is_active,
      },
      create: {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
        periodicity: item.periodicity,
        nit_digit_type: item.nit_digit_type,
        applies_to_gran_contribuyente: item.applies_to_gran_contribuyente,
        applies_to_persona_juridica: item.applies_to_persona_juridica,
        applies_to_persona_natural: item.applies_to_persona_natural,
        applies_to_rst: item.applies_to_rst,
        has_multiple_installments: item.has_multiple_installments,
        installment_count: item.installment_count,
        display_order: item.display_order,
        is_active: item.is_active,
      },
    });
    counts.taxObligationTypes++;
  }

  // Journal Entry Types
  for (const item of journalEntryTypes) {
    await tenantPrisma.journalEntryType.upsert({
      where: { key: item.key },
      update: { description: item.description, color: item.color },
      create: {
        key: item.key,
        description: item.description,
        color: item.color,
      },
    });
    counts.journalEntryTypes++;
  }

  // Bank Movement Types
  for (const item of bankMovementTypes) {
    await tenantPrisma.bankMovementType.upsert({
      where: { key: item.key },
      update: { description: item.description },
      create: {
        key: item.key,
        description: item.description,
      },
    });
    counts.bankMovementTypes++;
  }

  // AR/AP Sources
  for (const item of arApSources) {
    await tenantPrisma.arApSource.upsert({
      where: { key: item.key },
      update: { description: item.description },
      create: {
        key: item.key,
        description: item.description,
      },
    });
    counts.arApSources++;
  }

  // Company Payment Methods (métodos de pago personalizados por defecto)
  // Eliminar huérfanos sin consecutive (registros viejos pre-migración)
  await tenantPrisma.companyPaymentMethod.deleteMany({
    where: { consecutive: null },
  });

  for (const item of companyPaymentMethods) {
    // Buscar el PaymentMethod por código DIAN
    const paymentMethod = await tenantPrisma.paymentMethod.findUnique({
      where: { code: item.payment_method_code },
    });

    if (!paymentMethod) {
      console.warn(`    ⚠️ PaymentMethod código ${item.payment_method_code} no encontrado, saltando ${item.name}`);
      continue;
    }

    await tenantPrisma.companyPaymentMethod.upsert({
      where: { id: item.id },
      update: { name: item.name, description: item.description, consecutive: item.consecutive },
      create: {
        id: item.id,
        payment_method_id: paymentMethod.id,
        consecutive: item.consecutive,
        name: item.name,
        description: item.description,
        is_active: true,
      },
    });
    counts.companyPaymentMethods++;
  }

  // Consecutive Types (catálogo de tipos de consecutivo)
  for (const item of consecutiveTypes) {
    await tenantPrisma.consecutiveType.upsert({
      where: { type: item.type },
      update: {
        default_prefix: item.default_prefix,
        description: item.description,
        table_name: item.table_name,
        field_name: item.field_name,
        condition_field: item.condition_field,
        condition_value: item.condition_value,
      },
      create: {
        type: item.type,
        default_prefix: item.default_prefix,
        description: item.description,
        table_name: item.table_name,
        field_name: item.field_name,
        condition_field: item.condition_field,
        condition_value: item.condition_value,
      },
    });
    counts.consecutiveTypes++;
  }

  // Consecutives (inicializar desde consecutive_types usando default_prefix)
  for (const item of consecutiveTypes) {
    await tenantPrisma.consecutive.upsert({
      where: { type: item.type },
      update: {},
      create: {
        type: item.type,
        prefix: item.default_prefix,
        last_number: 0,
      },
    });
    counts.consecutives++;
  }

  // Product Movement Types
  for (const item of productMovementTypes) {
    await tenantPrisma.productMovementType.upsert({
      where: { key: item.key },
      update: { name: item.name },
      create: { key: item.key, name: item.name },
    });
    counts.productMovementTypes++;
  }

  // Bank Adjustment Types
  for (const item of bankAdjustmentTypes) {
    await tenantPrisma.bankAdjustmentType.upsert({
      where: { id: item.id },
      update: { name: item.name, direction: item.direction, account_code: item.account_code, is_active: item.is_active },
      create: {
        id: item.id,
        name: item.name,
        direction: item.direction,
        account_code: item.account_code,
        is_active: item.is_active,
      },
    });
    counts.bankAdjustmentTypes++;
  }

  // Expense Categories (datos locales, no de master)
  for (const item of expenseCategories) {
    await tenantPrisma.expenseCategory.upsert({
      where: { name: item.name },
      update: { expense_account_code: item.account_code, is_service: item.is_service },
      create: {
        name: item.name,
        description: `Categoría de gasto: ${item.name}`,
        expense_account_code: item.account_code,
        is_service: item.is_service,
      },
    });
    counts.expenseCategories++;
  }

  // AIU Category & Products (servicios paramétricos para facturación AIU)
  await tenantPrisma.productCategory.upsert({
    where: { id: aiuCategory.id },
    update: { name: aiuCategory.name, is_aiu: aiuCategory.is_aiu },
    create: {
      id: aiuCategory.id,
      consecutive: aiuCategory.consecutive,
      name: aiuCategory.name,
      is_aiu: aiuCategory.is_aiu,
    },
  });
  counts.aiuCategory++;

  for (const item of aiuProducts) {
    await tenantPrisma.product.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        is_aiu: true,
        is_service: true,
        revenue_account_code: item.revenue_account_code,
        category_id: aiuCategory.id,
      },
      create: {
        id: item.id,
        consecutive: item.consecutive,
        barcode: item.barcode,
        name: item.name,
        price: 0,
        category_id: aiuCategory.id,
        is_service: true,
        is_aiu: true,
        revenue_account_code: item.revenue_account_code,
      },
    });
    counts.aiuProducts++;
  }

  // Bag Category & Product (producto paramétrico para bolsa plástica INCBP)
  await tenantPrisma.productCategory.upsert({
    where: { id: bagCategory.id },
    update: { name: bagCategory.name, is_bag: bagCategory.is_bag },
    create: {
      id: bagCategory.id,
      consecutive: bagCategory.consecutive,
      name: bagCategory.name,
      is_bag: bagCategory.is_bag,
    },
  });
  counts.bagCategory++;

  for (const item of bagProducts) {
    await tenantPrisma.product.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        is_bag: true,
        is_service: true,
        tax_id: item.tax_id,
        revenue_account_code: item.revenue_account_code,
        category_id: bagCategory.id,
      },
      create: {
        id: item.id,
        consecutive: item.consecutive,
        barcode: item.barcode,
        name: item.name,
        price: 0,
        category_id: bagCategory.id,
        is_service: true,
        is_bag: true,
        tax_included: false,
        tax_id: item.tax_id,
        revenue_account_code: item.revenue_account_code,
      },
    });
    counts.bagProducts++;
  }

  // Sync consecutive counters (product, product_category)
  // Asegura que last_number >= max número usado en consecutivos estándar
  for (const ct of [
    { type: 'product', table: 'products', prefix: 'ART' },
    { type: 'product_category', table: 'product_categories', prefix: 'CAT' },
  ]) {
    const result: any[] = await tenantPrisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(
        CASE WHEN consecutive ~ '^${ct.prefix}-[0-9]+$'
        THEN CAST(SUBSTRING(consecutive FROM '[0-9]+$') AS INTEGER)
        ELSE 0 END
      ), 0)::int as max_num
      FROM "${ct.table}"`
    );
    const maxNum = Number(result[0]?.max_num || 0);
    if (maxNum > 0) {
      await tenantPrisma.consecutive.updateMany({
        where: { type: ct.type, last_number: { lt: maxNum } },
        data: { last_number: maxNum },
      });
    }
  }

  // CRM Opportunity Stages (etapas del pipeline por defecto)
  for (const item of crmOpportunityStages) {
    const existing = await tenantPrisma.crmOpportunityStage.findFirst({
      where: { name: item.name },
    });
    if (!existing) {
      await tenantPrisma.crmOpportunityStage.create({ data: item });
    }
    counts.crmOpportunityStages++;
  }

  // Company Settings (HR Config - configuración de empresa clave-valor)
  for (const item of companySettings) {
    await tenantPrisma.companySetting.upsert({
      where: { category_key: { category: item.category, key: item.key } },
      update: { value: item.value, description: item.description },
      create: {
        category: item.category,
        key: item.key,
        value: item.value,
        value_type: item.value_type,
        description: item.description,
        is_readonly: item.is_readonly,
      },
    });
    counts.companySettings++;
  }

  // Social Security Entities (ThirdParty con roles EPS, ARL, PENSION_FUND, etc.)
  for (const item of socialSecurityEntities) {
    const existing = await tenantPrisma.thirdParty.findFirst({
      where: { identification_number: item.identification_number },
    });
    if (!existing) {
      await tenantPrisma.thirdParty.create({
        data: {
          name: item.name,
          identification_number: item.identification_number,
          roles: item.roles as any,
          is_active: item.is_active,
        },
      });
    }
    counts.socialSecurityEntities++;
  }

  // Exogenous Formats (año 2025)
  const currentYear = 2025;
  const formatIdMap: Record<string, string> = {};

  for (const item of exogenousFormats) {
    const format = await tenantPrisma.companyExogenousFormat.upsert({
      where: { year_code: { year: currentYear, code: item.code } },
      update: { name: item.name },
      create: {
        year: currentYear,
        code: item.code,
        name: item.name,
      },
    });
    formatIdMap[item.code] = format.id;
    counts.exogenousFormats++;
  }

  // Exogenous Concepts
  for (const item of exogenousConcepts) {
    const formatId = formatIdMap[item.format_code];
    if (!formatId) continue;

    await tenantPrisma.companyExogenousConcept.upsert({
      where: {
        company_exogenous_format_id_code: {
          company_exogenous_format_id: formatId,
          code: item.code,
        },
      },
      update: { name: item.name },
      create: {
        company_exogenous_format_id: formatId,
        code: item.code,
        name: item.name,
      },
    });
    counts.exogenousConcepts++;
  }

  // Payroll Concepts
  for (const item of PAYROLL_CONCEPTS) {
    await tenantPrisma.payrollConcept.upsert({
      where: { key: item.key },
      update: {
        name: item.name,
        debit_account_code: item.debit_account_code,
        credit_account_code: item.credit_account_code,
        administrative_debit_account_code: item.administrative_debit_account_code,
        default_value: item.default_value,
        default_percentage: item.default_percentage,
        is_percentage: item.is_percentage,
        is_array: item.is_array,
        is_legal: item.is_legal,
        concept_type: item.concept_type as any,
      },
      create: {
        key: item.key,
        name: item.name,
        debit_account_code: item.debit_account_code,
        credit_account_code: item.credit_account_code,
        administrative_debit_account_code: item.administrative_debit_account_code,
        default_value: item.default_value,
        default_percentage: item.default_percentage,
        is_percentage: item.is_percentage,
        is_array: item.is_array,
        is_legal: item.is_legal,
        concept_type: item.concept_type as any,
      },
    });
    counts.payrollConcepts++;
  }

  // Payroll Withholding UVT (Tabla de Retención en la Fuente)
  for (const item of PAYROLL_WITHHOLDING_UVT) {
    await tenantPrisma.payrollWithholdingUvt.upsert({
      where: {
        year_procedure_from_uvt: {
          year: item.year,
          procedure: item.procedure,
          from_uvt: item.from_uvt,
        },
      },
      update: {
        to_uvt: item.to_uvt,
        fixed_fee_uvt: item.fixed_fee_uvt,
        marginal_rate: item.marginal_rate,
        subtract_uvt: item.subtract_uvt,
      },
      create: {
        year: item.year,
        procedure: item.procedure,
        from_uvt: item.from_uvt,
        to_uvt: item.to_uvt,
        fixed_fee_uvt: item.fixed_fee_uvt,
        marginal_rate: item.marginal_rate,
        subtract_uvt: item.subtract_uvt,
      },
    });
    counts.payrollWithholdingUvt++;
  }

  // Bank Accounts (Caja General, etc.)
  for (const item of bankAccounts) {
    const accountConfig = await tenantPrisma.accountingConfig.findUnique({
      where: { key: item.account_config_key },
    });

    if (!accountConfig?.account_code) continue;

    const existing = await tenantPrisma.bankAccount.findFirst({
      where: { account_name: item.account_name, account_type: item.account_type },
    });

    if (!existing) {
      await tenantPrisma.bankAccount.create({
        data: {
          account_name: item.account_name,
          account_type: item.account_type,
          account_id: accountConfig.account_code,
          initial_balance: 0,
          current_balance: 0,
          is_active: true,
        },
      });
    }
    counts.bankAccounts++;
  }

  // Cost Center Movement Types (tipo de línea del movimiento — datos locales, no de master)
  for (const item of costCenterMovementTypes) {
    await tenantPrisma.costCenterMovementType.upsert({
      where: { key: item.key },
      update: { name: item.name, nature: item.nature },
      create: { key: item.key, name: item.name, nature: item.nature },
    });
    counts.costCenterMovementTypes++;
  }
  // Limpiar CC movement types obsoletos (period_close, opening_balance — no aplican a CC)
  await tenantPrisma.costCenterMovementType.deleteMany({
    where: { key: { in: ['period_close', 'opening_balance'] } },
  });

  // Cost Center Movement Reference Types (tipo de documento origen — datos locales, no de master)
  for (const item of costCenterMovementReferenceTypes) {
    await tenantPrisma.costCenterMovementReferenceType.upsert({
      where: { key: item.key },
      update: { name: item.name },
      create: { key: item.key, name: item.name },
    });
    counts.costCenterMovementReferenceTypes++;
  }
  // Limpiar CC movement reference types obsoletos
  await tenantPrisma.costCenterMovementReferenceType.deleteMany({
    where: { key: 'accounting_period' },
  });

  return counts;
}

async function seedAllTenants() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');
  const companyIdArg = args.find(a => a.startsWith('--company-id='));
  const companyIdFilter = companyIdArg ? companyIdArg.split('=')[1] : null;

  console.log('🌱 Seed All Tenants Script');
  console.log('==========================\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  if (companyIdFilter) {
    console.log(`🎯 Filtering by company ID: ${companyIdFilter}\n`);
  }

  // 1. Obtener empresas activas (filtrar por ID si se especificó)
  const companies = await masterPrisma.company.findMany({
    where: {
      is_active: true,
      ...(companyIdFilter ? { id: companyIdFilter } : {}),
    },
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

  console.log(`📊 Found ${companies.length} active tenant(s)\n`);

  if (companies.length === 0) {
    console.log('✅ No tenants to seed');
    return;
  }

  // Mostrar resumen
  console.log('Tenants to seed:');
  companies.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.company_name} (${c.db_name})`);
  });
  console.log('');

  // Confirmar si no es force
  if (!isForce && !isDryRun) {
    const confirmed = await askConfirmation(
      `⚠️  This will seed catalogs on ${companies.length} database(s). Continue? (y/N): `,
    );
    if (!confirmed) {
      console.log('❌ Aborted by user');
      process.exit(0);
    }
  }

  // 2. Seedear cada tenant
  const results: { company: string; success: boolean; counts?: any; error?: string }[] = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const dbUrl = buildDatabaseUrl(company);

    console.log(`\n[${i + 1}/${companies.length}] Seeding: ${company.company_name} (${company.db_name})`);

    if (isDryRun) {
      console.log(`  Would seed catalogs from Master to this tenant`);
      results.push({ company: company.company_name, success: true });
      continue;
    }

    try {
      // Crear cliente Prisma para este tenant
      const tenantPrisma = new TenantPrismaClient({
        datasources: {
          db: { url: dbUrl },
        },
      });

      const roleCounts = await seedTenantRoles(tenantPrisma);
      const moduleCounts = await seedTenantModules(tenantPrisma, company.id);
      const permCounts = await seedDefaultRolePermissions(tenantPrisma);
      const phRoleResult = await seedPhResidentRole(tenantPrisma, company.id, masterPrisma);
      const counts = await seedTenantCatalogs(tenantPrisma);
      const profileCounts = await seedCompanyProfileSettings(tenantPrisma, company.id);
      await tenantPrisma.$disconnect();

      console.log(`  ✅ Success - ${roleCounts.rolesCreated} roles, ${moduleCounts.modules} modules, ${moduleCounts.actions} actions, ${permCounts.permissionsCreated} role_perms, ph_resident: ${phRoleResult.created ? 'CREATED' : phRoleResult.permissions > 0 ? 'synced' : 'skip'}, ${profileCounts.profileSettings} profile_settings, ${counts.departments} depts, ${counts.banks} banks, ${counts.paymentMethods} pm, ${counts.productUnits} pu, ${counts.taxTypes} tt, ${counts.taxes} tx, ${counts.arlRisks} arl, ${counts.typeWorkers} tw, ${counts.subTypeWorkers} stw, ${counts.typeContracts} tc, ${counts.events} ev, ${counts.typeDocuments} td, ${counts.typeRejections} tr, ${counts.typePayrollAdjustNotes} tpan, ${counts.workerSubtypeRules} wsr, ${counts.taxObligationTypes} tot, ${counts.chartOfAccounts} coa, ${counts.accountingConfigs} ac, ${counts.journalEntryTypes} jet, ${counts.bankMovementTypes} bmt, ${counts.arApSources} aas, ${counts.companyPaymentMethods} cpm, ${counts.consecutiveTypes} ct, ${counts.consecutives} cons, ${counts.productMovementTypes} pmt, ${counts.bankAdjustmentTypes} bat, ${counts.expenseCategories} ec, ${counts.companySettings} cs, ${counts.socialSecurityEntities} sse, ${counts.payrollConcepts} pc, ${counts.bankAccounts} ba, ${counts.costCenterMovementTypes} ccmt, ${counts.costCenterMovementReferenceTypes} ccmrt, ${counts.typeOperations} top, ${counts.aiuCategory} aiu_cat, ${counts.aiuProducts} aiu_prod, ${counts.bagCategory} bag_cat, ${counts.bagProducts} bag_prod`);
      results.push({ company: company.company_name, success: true, counts });
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      console.log(`  ❌ Failed: ${errorMessage}`);
      results.push({ company: company.company_name, success: false, error: errorMessage });
    }
  }

  // 3. Resumen final
  console.log('\n==========================');
  console.log('📊 Seed Summary\n');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed tenants:');
    failed.forEach((f) => {
      console.log(`  - ${f.company}: ${f.error?.substring(0, 80)}...`);
    });
  }

  // 4. Cleanup: drop staging table if all tenants migrated successfully
  if (!isDryRun && failed.length === 0) {
    try {
      await masterPrisma.$executeRaw`DROP TABLE IF EXISTS "_company_profile_staging"`;
      console.log('\n🗑️  Staging table _company_profile_staging dropped (data migrated)');
    } catch {
      // Table might not exist — ignore
    }
  }

  console.log('\n✅ Seed process completed');
}

// Ejecutar
seedAllTenants()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await masterPrisma.$disconnect();
  });
