import { ActionDef } from '../types';

import { dashboardActions } from './dashboard';
import { salesActions } from './sales';
import { quotesActions } from './quotes';
import { point_of_saleActions } from './point_of_sale';
import { cash_registersActions } from './cash_registers';
import { inventoryActions } from './inventory';
import { inventory_managementActions } from './inventory_management';
import { purchase_ordersActions } from './purchase_orders';
import { purchasesActions } from './purchases';
import { expensesActions } from './expenses';
import { third_partiesActions } from './third_parties';
import { ar_apActions } from './ar_ap';
import { accountingActions } from './accounting';
import { bankingActions } from './banking';
import { fixed_assetsActions } from './fixed_assets';
import { cost_centersActions } from './cost_centers';
import { taxActions } from './tax';
import { closingActions } from './closing';
import { exogenousActions } from './exogenous';
import { electronic_documentsActions } from './electronic_documents';
import { core_hrActions } from './core_hr';
import { time_attendanceActions } from './time_attendance';
import { leaves_vacationsActions } from './leaves_vacations';
import { hr_payrollActions } from './hr_payroll';
import { hr_expensesActions } from './hr_expenses';
import { hr_performanceActions } from './hr_performance';
import { crmActions } from './crm';
import { communication_templatesActions } from './communication_templates';
import { reportsActions } from './reports';
import { user_managementActions } from './user_management';
import { company_profileActions } from './company_profile';
import { configurationsActions } from './configurations';
import { phActions } from './ph';
import { hr_portalActions } from './hr_portal';

export const actionsByModule: Record<string, ActionDef[]> = {
  dashboard: dashboardActions,
  sales: salesActions,
  quotes: quotesActions,
  point_of_sale: point_of_saleActions,
  cash_registers: cash_registersActions,
  inventory: inventoryActions,
  inventory_management: inventory_managementActions,
  purchase_orders: purchase_ordersActions,
  purchases: purchasesActions,
  expenses: expensesActions,
  third_parties: third_partiesActions,
  ar_ap: ar_apActions,
  accounting: accountingActions,
  banking: bankingActions,
  fixed_assets: fixed_assetsActions,
  cost_centers: cost_centersActions,
  tax: taxActions,
  closing: closingActions,
  exogenous: exogenousActions,
  electronic_documents: electronic_documentsActions,
  core_hr: core_hrActions,
  time_attendance: time_attendanceActions,
  leaves_vacations: leaves_vacationsActions,
  hr_payroll: hr_payrollActions,
  hr_expenses: hr_expensesActions,
  hr_performance: hr_performanceActions,
  crm: crmActions,
  communication_templates: communication_templatesActions,
  reports: reportsActions,
  user_management: user_managementActions,
  company_profile: company_profileActions,
  configurations: configurationsActions,
  ph: phActions,
  hr_portal: hr_portalActions,
};

export const ALL_MODULE_KEYS = Object.keys(actionsByModule);
