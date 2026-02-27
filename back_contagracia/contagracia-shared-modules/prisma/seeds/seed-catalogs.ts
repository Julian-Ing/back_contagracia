import { PrismaClient, Prisma, TransactionDirection } from '@prisma/client-master';
import { typeDocumentIdentifications } from './typeDocumentIdentifications';
import { typeOrganizations } from './typeOrganizations';
import { typeRegimes } from './typeRegimes';
import { typeLiabilities } from './typeLiabilities';
import { productUnits } from './productUnits';
import { paymentMethods } from './paymentMethods';
import { taxes } from './taxes';
import { arlRisks } from './arlRisks';
import { typeWorkers } from './typeWorkers';
import { subTypeWorkers } from './subTypeWorkers';
import { typeContracts } from './typeContracts';
import { events } from './events';
import { typeDocuments } from './typeDocuments';
import { typeRejections } from './typeRejections';
import { typePayrollAdjustNotes } from './typePayrollAdjustNotes';
import { workerSubtypeRules } from './workerSubtypeRules';
import { taxObligationTypes } from './taxObligationTypes';
import { consecutiveTypes } from './consecutiveTypes';
import { productMovementTypes } from './productMovementTypes';
import { bankAdjustmentTypes } from './bankAdjustmentTypes';
import { typeOperations } from './typeOperations';

export async function seedCatalogs(prisma: PrismaClient) {
  console.log('🪪 Seeding Type Document Identifications...');
  for (const doc of typeDocumentIdentifications) {
    await prisma.typeDocumentIdentification.upsert({
      where: { id: doc.id },
      update: { code: doc.code, name: doc.name },
      create: { id: doc.id, code: doc.code, name: doc.name },
    });
  }
  console.log(`   ✅ ${typeDocumentIdentifications.length} tipos de documento creados\n`);

  console.log('🏢 Seeding Type Organizations...');
  for (const org of typeOrganizations) {
    await prisma.typeOrganization.upsert({
      where: { id: org.id },
      update: { code: org.code, name: org.name },
      create: { id: org.id, code: org.code, name: org.name },
    });
  }
  console.log(`   ✅ ${typeOrganizations.length} tipos de organización creados\n`);

  console.log('📜 Seeding Type Regimes...');
  for (const reg of typeRegimes) {
    await prisma.typeRegime.upsert({
      where: { id: reg.id },
      update: { code: reg.code, name: reg.name },
      create: { id: reg.id, code: reg.code, name: reg.name },
    });
  }
  console.log(`   ✅ ${typeRegimes.length} tipos de régimen creados\n`);

  console.log('📋 Seeding Type Liabilities...');
  for (const lib of typeLiabilities) {
    await prisma.typeLiability.upsert({
      where: { id: lib.id },
      update: { code: lib.code, name: lib.name },
      create: { id: lib.id, code: lib.code, name: lib.name },
    });
  }
  console.log(`   ✅ ${typeLiabilities.length} tipos de responsabilidad creados\n`);

  console.log('📏 Seeding Product Units...');
  for (const unit of productUnits) {
    await prisma.productUnit.upsert({
      where: { id: unit.id },
      update: { name: unit.name },
      create: { id: unit.id, name: unit.name },
    });
  }
  console.log(`   ✅ ${productUnits.length} unidades de producto creadas\n`);

  console.log('💳 Seeding Payment Methods...');
  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { id: pm.id },
      update: { code: pm.code, name: pm.name },
      create: { id: pm.id, code: pm.code, name: pm.name },
    });
  }
  console.log(`   ✅ ${paymentMethods.length} métodos de pago creados\n`);

  console.log('📊 Seeding Taxes...');
  for (const t of taxes) {
    await prisma.tax.upsert({
      where: { id: t.id },
      update: { code: t.code, name: t.name, rate: t.rate, tax_type_id: t.tax_type_id },
      create: { id: t.id, code: t.code, name: t.name, rate: t.rate, tax_type_id: t.tax_type_id },
    });
  }
  console.log(`   ✅ ${taxes.length} impuestos creados\n`);

  console.log('🛡️ Seeding ARL Risks...');
  for (const arl of arlRisks) {
    await prisma.arlRisk.upsert({
      where: { id: arl.id },
      update: { code: arl.code, name: arl.name, rate: arl.rate, is_active: true },
      create: { id: arl.id, code: arl.code, name: arl.name, rate: arl.rate, is_active: true },
    });
  }
  console.log(`   ✅ ${arlRisks.length} niveles de riesgo ARL creados\n`);

  console.log('👤 Seeding Type Workers...');
  for (const tw of typeWorkers) {
    await prisma.typeWorker.upsert({
      where: { id: tw.id },
      update: { code: tw.code, name: tw.name, is_active: true },
      create: { id: tw.id, code: tw.code, name: tw.name, is_active: true },
    });
  }
  console.log(`   ✅ ${typeWorkers.length} tipos de trabajador creados\n`);

  console.log('👷 Seeding Sub Type Workers...');
  for (const stw of subTypeWorkers) {
    await prisma.subTypeWorker.upsert({
      where: { id: stw.id },
      update: { code: stw.code, name: stw.name, is_active: true },
      create: { id: stw.id, code: stw.code, name: stw.name, is_active: true },
    });
  }
  console.log(`   ✅ ${subTypeWorkers.length} subtipos de trabajador creados\n`);

  console.log('📝 Seeding Type Contracts...');
  for (const tc of typeContracts) {
    await prisma.typeContract.upsert({
      where: { id: tc.id },
      update: { code: tc.code, name: tc.name, is_active: true },
      create: { id: tc.id, code: tc.code, name: tc.name, is_active: true },
    });
  }
  console.log(`   ✅ ${typeContracts.length} tipos de contrato creados\n`);

  console.log('📋 Seeding Events (RADIAN)...');
  for (const ev of events) {
    await prisma.event.upsert({
      where: { id: ev.id },
      update: { code: ev.code, name: ev.name, is_active: true },
      create: { id: ev.id, code: ev.code, name: ev.name, is_active: true },
    });
  }
  console.log(`   ✅ ${events.length} eventos RADIAN creados\n`);

  console.log('⚙️ Seeding Type Operations (DIAN)...');
  for (const to of typeOperations) {
    await prisma.typeOperation.upsert({
      where: { id: to.id },
      update: { code: to.code, name: to.name },
      create: { id: to.id, code: to.code, name: to.name, is_active: true },
    });
  }
  console.log(`   ✅ ${typeOperations.length} tipos de operación creados\n`);

  console.log('📄 Seeding Type Documents (DIAN)...');
  for (const td of typeDocuments) {
    await prisma.typeDocument.upsert({
      where: { id: td.id },
      update: { code: td.code, name: td.name, cufe_algorithm: td.cufe_algorithm, prefix: td.prefix, is_active: true },
      create: { id: td.id, code: td.code, name: td.name, cufe_algorithm: td.cufe_algorithm, prefix: td.prefix, is_active: true },
    });
  }
  console.log(`   ✅ ${typeDocuments.length} tipos de documento DIAN creados\n`);

  console.log('❌ Seeding Type Rejections (DIAN)...');
  for (const tr of typeRejections) {
    await prisma.typeRejection.upsert({
      where: { id: tr.id },
      update: { code: tr.code, name: tr.name, is_active: true },
      create: { id: tr.id, code: tr.code, name: tr.name, is_active: true },
    });
  }
  console.log(`   ✅ ${typeRejections.length} tipos de rechazo DIAN creados\n`);

  console.log('📝 Seeding Type Payroll Adjust Notes...');
  for (const tp of typePayrollAdjustNotes) {
    await prisma.typePayrollAdjustNote.upsert({
      where: { id: tp.id },
      update: { code: tp.code, name: tp.name, is_active: true },
      create: { id: tp.id, code: tp.code, name: tp.name, is_active: true },
    });
  }
  console.log(`   ✅ ${typePayrollAdjustNotes.length} tipos de nota ajuste nómina creados\n`);

  console.log('⚙️ Seeding Worker Subtype Rules...');
  for (const wsr of workerSubtypeRules) {
    await prisma.workerSubtypeRule.upsert({
      where: { id: wsr.id },
      update: {},
      create: {
        id: wsr.id,
        sub_type_worker_id: wsr.sub_type_worker_id,
        health_employee_rate: wsr.health_employee_rate,
        health_employer_rate: wsr.health_employer_rate,
        pension_employee_rate: wsr.pension_employee_rate,
        pension_employer_rate: wsr.pension_employer_rate,
        health_employee_pays: wsr.health_employee_pays,
        pension_employee_pays: wsr.pension_employee_pays,
        ccf_applies: wsr.ccf_applies,
        icbf_applies: wsr.icbf_applies,
        sena_applies: wsr.sena_applies,
        arl_applies: wsr.arl_applies,
        fsp_applies: wsr.fsp_applies,
        fsp_special_rate: wsr.fsp_special_rate,
        ibc_min_smmlv_percentage: wsr.ibc_min_smmlv_percentage,
        legal_notes: wsr.legal_notes,
        ui_display_name: wsr.ui_display_name,
        ui_impacts: wsr.ui_impacts ?? Prisma.JsonNull,
        ui_color: wsr.ui_color,
        is_active: true,
      },
    });
  }
  console.log(`   ✅ ${workerSubtypeRules.length} reglas de subtipo trabajador creadas\n`);

  console.log('📋 Seeding Tax Obligation Types...');
  for (const tot of taxObligationTypes) {
    await prisma.taxObligationType.upsert({
      where: { id: tot.id },
      update: {
        code: tot.code,
        name: tot.name,
        description: tot.description,
        category: tot.category,
        periodicity: tot.periodicity,
        nit_digit_type: tot.nit_digit_type,
        applies_to_gran_contribuyente: tot.applies_to_gran_contribuyente,
        applies_to_persona_juridica: tot.applies_to_persona_juridica,
        applies_to_persona_natural: tot.applies_to_persona_natural,
        applies_to_rst: tot.applies_to_rst,
        has_multiple_installments: tot.has_multiple_installments,
        installment_count: tot.installment_count,
        display_order: tot.display_order,
      },
      create: {
        id: tot.id,
        code: tot.code,
        name: tot.name,
        description: tot.description,
        category: tot.category,
        periodicity: tot.periodicity,
        nit_digit_type: tot.nit_digit_type,
        applies_to_gran_contribuyente: tot.applies_to_gran_contribuyente,
        applies_to_persona_juridica: tot.applies_to_persona_juridica,
        applies_to_persona_natural: tot.applies_to_persona_natural,
        applies_to_rst: tot.applies_to_rst,
        has_multiple_installments: tot.has_multiple_installments,
        installment_count: tot.installment_count,
        display_order: tot.display_order,
        is_active: true,
      },
    });
  }
  console.log(`   ✅ ${taxObligationTypes.length} tipos de obligación tributaria creados\n`);

  console.log('🔢 Seeding Consecutive Types...');
  for (const ct of consecutiveTypes) {
    await prisma.consecutiveType.upsert({
      where: { type: ct.type },
      update: {
        default_prefix: ct.default_prefix,
        description: ct.description,
        table_name: ct.table_name,
        condition_field: ct.condition_field,
        condition_value: ct.condition_value,
      },
      create: {
        type: ct.type,
        default_prefix: ct.default_prefix,
        description: ct.description,
        table_name: ct.table_name,
        condition_field: ct.condition_field,
        condition_value: ct.condition_value,
      },
    });
  }
  console.log(`   ✅ ${consecutiveTypes.length} tipos de consecutivo creados\n`);

  console.log('📦 Seeding Product Movement Types...');
  for (const pmt of productMovementTypes) {
    await prisma.productMovementType.upsert({
      where: { key: pmt.key },
      update: { name: pmt.name },
      create: { key: pmt.key, name: pmt.name },
    });
  }
  console.log(`   ✅ ${productMovementTypes.length} tipos de movimiento creados\n`);

  console.log('🏦 Seeding Bank Adjustment Types...');
  for (const bat of bankAdjustmentTypes) {
    const direction = bat.direction === 'IN' ? TransactionDirection.IN : TransactionDirection.OUT;
    await prisma.bankAdjustmentType.upsert({
      where: { id: `bat-${bat.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}` },
      update: { name: bat.name, direction, account_code: bat.account_code },
      create: {
        id: `bat-${bat.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}`,
        name: bat.name,
        direction,
        account_code: bat.account_code,
        is_active: true,
      },
    });
  }
  console.log(`   ✅ ${bankAdjustmentTypes.length} tipos de ajuste bancario creados\n`);
}
