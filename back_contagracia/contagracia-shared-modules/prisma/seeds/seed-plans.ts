import { PrismaClient } from '@prisma/client-master';
import { ALL_MODULE_KEYS } from './modules';

const plans = [
  {
    name: 'Trial',
    description: 'Prueba gratuita de 14 días',
    price: 0,
    max_users: 5,
    max_invoices: 100,
    max_products: 200,
    max_employees: 10,
    is_trial: true,
    trial_days: 14,
    modules: ['dashboard', 'company_profile', 'sales', 'quotes', 'inventory', 'third_parties', 'ar_ap', 'expenses', 'purchases', 'accounting', 'banking', 'tax', 'reports', 'user_management', 'configurations'],
  },
  {
    name: 'Básico',
    description: 'Para emprendimientos y pequeñas empresas',
    price: 99000,
    max_users: 3,
    max_invoices: 100,
    max_products: 200,
    max_employees: null,
    is_trial: false,
    trial_days: 0,
    modules: ['dashboard', 'company_profile', 'sales', 'inventory', 'third_parties', 'ar_ap', 'reports', 'user_management', 'configurations'],
  },
  {
    name: 'Profesional',
    description: 'Para empresas en crecimiento',
    price: 299000,
    max_users: 10,
    max_invoices: 1000,
    max_products: 2000,
    max_employees: 50,
    is_trial: false,
    trial_days: 0,
    modules: ['dashboard', 'company_profile', 'sales', 'quotes', 'point_of_sale', 'cash_registers', 'inventory', 'inventory_management', 'purchase_orders', 'purchases', 'expenses', 'third_parties', 'ar_ap', 'accounting', 'banking', 'fixed_assets', 'cost_centers', 'tax', 'closing', 'electronic_documents', 'core_hr', 'time_attendance', 'leaves_vacations', 'hr_payroll', 'crm', 'reports', 'user_management', 'configurations'],
  },
  {
    name: 'Empresarial',
    description: 'Para grandes empresas - Todas las funcionalidades',
    price: 799000,
    max_users: -1,
    max_invoices: null,
    max_products: null,
    max_employees: null,
    is_trial: false,
    trial_days: 0,
    modules: ALL_MODULE_KEYS,
  },
];

export async function seedPlans(prisma: PrismaClient, moduleMap: Map<string, string>) {
  console.log('📋 Seeding Plans...');
  for (const planData of plans) {
    const { modules: planModules, ...planInfo } = planData;

    const plan = await prisma.plan.upsert({
      where: { name: planData.name },
      update: planInfo,
      create: planInfo,
    });

    await prisma.planModule.deleteMany({ where: { plan_id: plan.id } });

    for (const moduleKey of planModules) {
      const moduleId = moduleMap.get(moduleKey);
      if (moduleId) {
        await prisma.planModule.create({
          data: { plan_id: plan.id, module_id: moduleId },
        });
      }
    }

    console.log(`   ✅ Plan "${plan.name}" con ${planModules.length} módulos`);
  }
  console.log('');
}
