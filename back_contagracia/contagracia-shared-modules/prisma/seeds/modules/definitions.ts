import { ModuleDef } from './types';

export const modules: ModuleDef[] = [
  // General
  { module_key: 'dashboard', module_name: 'Dashboard', description: 'Panel principal', icon: 'LayoutDashboard', group: 'General', sort_order: 1 },
  { module_key: 'company_profile', module_name: 'Perfil de Empresa', description: 'Configuración de la empresa', icon: 'Building', group: 'General', sort_order: 2 },
  { module_key: 'configurations', module_name: 'Configuraciones', description: 'Ajustes del sistema', icon: 'Settings', group: 'General', sort_order: 3 },
  { module_key: 'user_management', module_name: 'Gestión de Usuarios', description: 'Administración de usuarios y permisos', icon: 'Users', group: 'General', sort_order: 4 },

  // Operaciones
  { module_key: 'sales', module_name: 'Ventas / Facturación', description: 'Facturación electrónica', icon: 'Receipt', group: 'Operaciones', sort_order: 10 },
  { module_key: 'quotes', module_name: 'Cotizaciones', description: 'Cotizaciones y propuestas', icon: 'FileText', group: 'Operaciones', sort_order: 11 },
  { module_key: 'inventory', module_name: 'Inventario', description: 'Productos y servicios', icon: 'Package', group: 'Operaciones', sort_order: 20 },
  { module_key: 'inventory_management', module_name: 'Almacenes y Bodegas', description: 'Gestión de bodegas', icon: 'Warehouse', group: 'Operaciones', sort_order: 21 },
  { module_key: 'purchase_orders', module_name: 'Órdenes de Compra', description: 'Órdenes a proveedores', icon: 'ClipboardList', group: 'Operaciones', sort_order: 22 },
  { module_key: 'purchases', module_name: 'Compras', description: 'Registro de compras', icon: 'ShoppingBag', group: 'Operaciones', sort_order: 30 },
  { module_key: 'expenses', module_name: 'Gastos', description: 'Control de gastos', icon: 'CreditCard', group: 'Operaciones', sort_order: 31 },
  { module_key: 'third_parties', module_name: 'Terceros', description: 'Clientes, proveedores, empleados', icon: 'Users', group: 'Operaciones', sort_order: 40 },

  // Finanzas
  { module_key: 'ar_ap', module_name: 'Cuentas por Cobrar/Pagar', description: 'Cartera y obligaciones', icon: 'Wallet', group: 'Finanzas', sort_order: 41 },
  { module_key: 'accounting', module_name: 'Contabilidad', description: 'Asientos y libros contables', icon: 'Calculator', group: 'Finanzas', sort_order: 50 },
  { module_key: 'banking', module_name: 'Bancos', description: 'Cuentas bancarias y conciliaciones', icon: 'Landmark', group: 'Finanzas', sort_order: 51 },
  { module_key: 'fixed_assets', module_name: 'Activos Fijos', description: 'Depreciación y control de activos', icon: 'Building2', group: 'Finanzas', sort_order: 52 },
  { module_key: 'cost_centers', module_name: 'Centros de Costos', description: 'Distribución de costos', icon: 'PieChart', group: 'Finanzas', sort_order: 53 },
  { module_key: 'tax', module_name: 'Impuestos', description: 'Gestión tributaria', icon: 'FileSpreadsheet', group: 'Finanzas', sort_order: 60 },
  { module_key: 'closing', module_name: 'Cierre Contable', description: 'Cierre de periodos', icon: 'Lock', group: 'Finanzas', sort_order: 61 },
  { module_key: 'exogenous', module_name: 'Información Exógena', description: 'Reportes a la DIAN', icon: 'FileOutput', group: 'Finanzas', sort_order: 62 },
  { module_key: 'reports', module_name: 'Reportes', description: 'Informes y estadísticas', icon: 'BarChart3', group: 'Finanzas', sort_order: 100 },

  // POS
  { module_key: 'point_of_sale', module_name: 'Punto de Venta', description: 'POS para ventas rápidas', icon: 'ShoppingCart', group: 'POS', sort_order: 12 },
  { module_key: 'cash_registers', module_name: 'Cajas Registradoras', description: 'Control de cajas', icon: 'Banknote', group: 'POS', sort_order: 13 },

  // Recursos Humanos
  { module_key: 'core_hr', module_name: 'Gestión de Empleados', description: 'Datos de empleados', icon: 'UserCog', group: 'Recursos Humanos', sort_order: 80 },
  { module_key: 'time_attendance', module_name: 'Control de Tiempo', description: 'Asistencia y horarios', icon: 'Clock', group: 'Recursos Humanos', sort_order: 81 },
  { module_key: 'leaves_vacations', module_name: 'Vacaciones y Ausencias', description: 'Control de licencias', icon: 'Calendar', group: 'Recursos Humanos', sort_order: 82 },
  { module_key: 'hr_payroll', module_name: 'Nómina', description: 'Liquidación de nómina', icon: 'DollarSign', group: 'Recursos Humanos', sort_order: 83 },
  { module_key: 'hr_expenses', module_name: 'Gastos de Empleados', description: 'Anticipos y reembolsos', icon: 'Receipt', group: 'Recursos Humanos', sort_order: 84 },
  { module_key: 'hr_performance', module_name: 'Evaluaciones', description: 'Desempeño y objetivos', icon: 'Target', group: 'Recursos Humanos', sort_order: 85 },
  { module_key: 'hr_portal', module_name: 'Portal del Empleado', description: 'Autoservicio: mis desprendibles, contrato, ausencias y perfil', icon: 'UserCircle', group: 'Recursos Humanos', sort_order: 86 },

  // Propiedad Horizontal
  { module_key: 'ph', module_name: 'Propiedad Horizontal', description: 'Gestión de copropiedades, unidades, residentes y facturación PH', icon: 'Building2', group: 'Propiedad Horizontal', sort_order: 95 },

  // Documentos Electrónicos
  { module_key: 'electronic_documents', module_name: 'Documentos Electrónicos', description: 'Documentos electrónicos, resoluciones y radian', icon: 'FileCheck', group: 'Operaciones', sort_order: 15 },

  // Otros
  { module_key: 'crm', module_name: 'CRM', description: 'Gestión de clientes y oportunidades', icon: 'HeartHandshake', group: 'Otros', sort_order: 90 },
  { module_key: 'communication_templates', module_name: 'Plantillas de Comunicación', description: 'Email y WhatsApp templates', icon: 'Mail', group: 'Otros', sort_order: 91 },
];
