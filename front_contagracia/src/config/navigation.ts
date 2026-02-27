/**
 * Configuración de navegación del sidebar
 * Define todas las rutas, iconos y permisos del menú
 */

import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Banknote,
  Users,
  Package,
  Warehouse,
  MapPin,
  Tags,
  ShoppingCart,
  Receipt,
  ListPlus,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
  Store,
  Clock,
  Ruler,
  Briefcase,
  DollarSign,
  TrendingUp,
  Handshake,
  Megaphone,
  Crosshair,
  User,
  UserCheck,
  Calendar,
  MessageSquare,
  Zap,
  Building2,
  Home,
  Key,
  Car,
  CalendarDays,
  Building,
  UserPlus,
  Mail,
  FileSignature,
  GitBranch,
  ArrowRightLeft,
  Shield,
  Wrench,
  FolderOpen,
  DoorOpen,
  HelpCircle,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';

// Tipos
export interface NavItemConfig {
  id: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  modules?: string[]; // Módulos requeridos (OR - cualquiera de ellos)
  permission?: string; // Permiso (action_key) requerido para ver este item
  anyPermission?: string[]; // Cualquiera de estos permisos permite ver (OR)
  children?: NavItemConfig[];
  adminOnly?: boolean; // Solo para admins
  badge?: string | number; // Badge opcional
  disabled?: boolean; // Item deshabilitado (próximamente)
  altLabel?: string; // Label alternativo cuando el usuario NO tiene altLabelPermission
  altLabelPermission?: string; // Si el usuario tiene este permiso, usa label; si no, usa altLabel
}

// Configuración completa del menú
export const NAVIGATION_CONFIG: NavItemConfig[] = [
  // Dashboard
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    modules: ['dashboard'],
    permission: 'dashboard.view',
  },

  // Contabilidad
  {
    id: 'contabilidad',
    label: 'Contabilidad',
    icon: BookOpen,
    modules: ['sales', 'inventory', 'purchases', 'expenses', 'third_parties', 'ar_ap', 'accounting', 'banking', 'fixed_assets'],
    children: [
      {
        id: 'facturas',
        label: 'Facturas',
        href: '/dashboard/invoices',
        icon: FileText,
        modules: ['sales'],
        permission: 'sales.invoices.view',
      },
      {
        id: 'bancos',
        label: 'Bancos y Cuentas',
        href: '/dashboard/banking',
        icon: Banknote,
        modules: ['banking'],
        permission: 'bank_accounts.view',
      },
      {
        id: 'cotizaciones',
        label: 'Cotizaciones',
        href: '/dashboard/quotes',
        icon: FileSignature,
        modules: ['sales', 'crm'],
        permission: 'quotes.view',
      },
      {
        id: 'terceros',
        label: 'Terceros',
        href: '/dashboard/third-parties',
        icon: Users,
        modules: ['third_parties'],
        permission: 'third_parties.view',
      },
      // Inventario (submenú anidado)
      {
        id: 'inventario',
        label: 'Inventario',
        icon: Package,
        modules: ['inventory'],
        children: [
          {
            id: 'almacenes',
            label: 'Almacenes',
            href: '/dashboard/warehouses',
            icon: Warehouse,
            modules: ['inventory_management'],
            permission: 'warehouses.view',
          },
          {
            id: 'bodegas',
            label: 'Bodegas',
            href: '/dashboard/storages',
            icon: MapPin,
            modules: ['inventory_management'],
            permission: 'storages.view',
          },
          {
            id: 'transferencias',
            label: 'Transferencias',
            href: '/dashboard/storage-transfers',
            icon: ArrowRightLeft,
            modules: ['inventory_management'],
            permission: 'transfers.view',
          },
          {
            id: 'productos',
            label: 'Productos',
            href: '/dashboard/inventory',
            icon: Package,
            modules: ['inventory'],
            anyPermission: ['inventory.items.view', 'inventory.categories.view'],
          },
          {
            id: 'atributos',
            label: 'Atributos y Opciones',
            href: '/dashboard/attributes-and-terms',
            icon: Tags,
            modules: ['inventory'],
            permission: 'inventory.attributes.view',
          },
          {
            id: 'ordenes-compra',
            label: 'Órdenes de Compra',
            href: '/dashboard/purchase-orders',
            icon: FileText,
            modules: ['purchases'],
            permission: 'purchases.view',
          },
        ],
      },
      {
        id: 'compras',
        label: 'Compras',
        href: '/dashboard/purchase-history',
        icon: ShoppingCart,
        modules: ['purchases'],
        permission: 'purchases.view',
      },
      {
        id: 'gastos',
        label: 'Gastos',
        href: '/dashboard/expenses',
        icon: Receipt,
        modules: ['expenses'],
        permission: 'expenses.view',
      },
      {
        id: 'categorias-gasto',
        label: 'Categorías de Gasto',
        href: '/dashboard/expense-categories',
        icon: ListPlus,
        modules: ['expenses'],
        permission: 'expense_categories.view',
      },
      // Cartera (submenú anidado)
      {
        id: 'cartera',
        label: 'Cartera',
        icon: Wallet,
        modules: ['ar_ap'],
        children: [
          {
            id: 'cuentas-cobrar',
            label: 'Cuentas por Cobrar',
            href: '/dashboard/accounts-receivable',
            icon: CreditCard,
            modules: ['ar_ap'],
            permission: 'ar.view',
          },
          {
            id: 'cuentas-pagar',
            label: 'Cuentas por Pagar',
            href: '/dashboard/accounts-payable',
            icon: Wallet,
            modules: ['ar_ap'],
            permission: 'ap.view',
          },
          {
            id: 'anticipos',
            label: 'Anticipos',
            href: '/dashboard/prepayments',
            icon: DollarSign,
            modules: ['ar_ap'],
            permission: 'prepayments.view',
          },
          {
            id: 'metodos-pago',
            label: 'Métodos de Pago',
            href: '/dashboard/payment-methods',
            icon: CreditCard,
            modules: ['ar_ap'],
            permission: 'payment_methods.view',
          },
          {
            id: 'reportes-cartera',
            label: 'Reportes',
            href: '/dashboard/cartera-reports',
            icon: BarChart3,
            modules: ['ar_ap'],
            permission: 'cartera.reports.view',
          },
          {
            id: 'config-cartera',
            label: 'Configuraciones',
            href: '/dashboard/cartera-settings',
            icon: Settings,
            modules: ['ar_ap'],
            permission: 'config.view',
          },
        ],
      },
      {
        id: 'causacion',
        label: 'Causación Semiautomática',
        href: '/dashboard/causacion-semiautomatica',
        icon: FileSignature,
        modules: ['expenses', 'purchases'],
        permission: 'expenses.view',
      },
      {
        id: 'activos-fijos',
        label: 'Activos Fijos',
        href: '/dashboard/fixed-assets',
        icon: Package,
        modules: ['fixed_assets'],
        permission: 'fixed_assets.view',
      },
      {
        id: 'contabilidad-modulo',
        label: 'Contabilidad',
        href: '/dashboard/accounting',
        icon: BookOpen,
        modules: ['accounting'],
        permission: 'accounting.view',
      },
    ],
  },

  // POS
  {
    id: 'pos',
    label: 'POS',
    icon: Store,
    modules: ['point_of_sale', 'cash_registers'],
    children: [
      {
        id: 'punto-venta',
        label: 'Punto de Venta',
        href: '/dashboard/point-of-sale',
        icon: Store,
        modules: ['point_of_sale'],
        permission: 'pos.access',
      },
      {
        id: 'cajas',
        label: 'Cajas Registradoras',
        href: '/dashboard/cash-registers',
        icon: Wallet,
        modules: ['cash_registers'],
        permission: 'cash_registers.view',
      },
      {
        id: 'sesiones-caja',
        label: 'Sesiones de Caja',
        href: '/dashboard/cash-register-sessions',
        icon: Clock,
        modules: ['cash_registers'],
        permission: 'cash_sessions.view',
      },
    ],
  },

  // Centro de Costos
  {
    id: 'centro-costos',
    label: 'Centro de Costos',
    icon: Ruler,
    modules: ['cost_centers'],
    children: [
      {
        id: 'centros',
        label: 'Centro de Costos',
        href: '/dashboard/cost-centers',
        icon: Ruler,
        modules: ['cost_centers'],
        permission: 'cost_centers.view',
      },
      {
        id: 'proyecciones',
        label: 'Proyecciones',
        href: '/dashboard/projections',
        icon: BarChart3,
        modules: ['cost_centers'],
        permission: 'cost_centers.projections.view',
      },
    ],
  },

  // Recursos Humanos
  {
    id: 'rrhh',
    label: 'Recursos Humanos',
    icon: Briefcase,
    modules: ['core_hr', 'time_attendance', 'leaves_vacations', 'hr_payroll', 'hr_expenses', 'hr_performance', 'hr_portal'],
    children: [
      // Mi Portal (autoservicio empleado)
      {
        id: 'mi-portal',
        label: 'Mi Portal',
        href: '/dashboard/mi-portal',
        icon: UserCircle,
        modules: ['hr_portal'],
        anyPermission: ['portal.profile.view', 'portal.contract.view', 'portal.leaves.view', 'payslips.view'],
      },
      {
        id: 'empleados',
        label: 'Empleados y Anticipos',
        href: '/dashboard/employees',
        icon: Users,
        modules: ['core_hr'],
        permission: 'employees.view',
      },
      {
        id: 'asistencia',
        label: 'Asistencia',
        href: '/dashboard/attendance',
        icon: Clock,
        modules: ['time_attendance'],
        permission: 'attendance.view',
      },
      {
        id: 'permisos',
        label: 'Permisos',
        href: '/dashboard/leaves',
        icon: Calendar,
        modules: ['leaves_vacations'],
        permission: 'leaves.view',
      },
      {
        id: 'nomina',
        label: 'Nómina',
        href: '/dashboard/payroll',
        icon: DollarSign,
        modules: ['hr_payroll'],
        permission: 'payroll_settlements.view',
      },
      {
        id: 'gastos-viaticos',
        label: 'Gastos Viáticos',
        href: '/dashboard/hr-expenses',
        icon: Receipt,
        modules: ['hr_expenses'],
        permission: 'hr_expenses.view',
      },
      {
        id: 'solicitudes-pago',
        label: 'Solicitudes de Pago',
        href: '/dashboard/service-billing',
        icon: FileText,
        modules: ['core_hr'],
        permission: 'employees.view',
        adminOnly: true,
      },
      {
        id: 'evaluaciones',
        label: 'Evaluaciones de Desempeño',
        href: '/dashboard/performance-evaluations',
        icon: TrendingUp,
        modules: ['hr_performance'],
        permission: 'performance.view',
      },
      {
        id: 'observaciones',
        label: 'Observaciones de Empleados',
        href: '/dashboard/employee-observations',
        icon: MessageSquare,
        modules: ['hr_performance'],
        permission: 'observations.view',
      },
      {
        id: 'turnos',
        label: 'Turnos',
        href: '/dashboard/shifts',
        icon: CalendarDays,
        modules: ['core_hr'],
        anyPermission: ['shifts.templates.view', 'shifts.self.view'],
      },
    ],
  },

  // CRM
  {
    id: 'crm',
    label: 'CRM',
    icon: Handshake,
    modules: ['crm'],
    children: [
      {
        id: 'crm-dashboard',
        label: 'Dashboard',
        href: '/dashboard/crm',
        icon: LayoutDashboard,
        modules: ['crm'],
        permission: 'crm.dashboard.view',
      },
      {
        id: 'formularios',
        label: 'Formularios Web',
        href: '/dashboard/crm/forms',
        icon: FileText,
        modules: ['crm'],
        permission: 'crm.forms.view',
      },
      {
        id: 'campanas',
        label: 'Campañas',
        href: '/dashboard/crm/campaigns',
        icon: Megaphone,
        modules: ['crm'],
        permission: 'crm.campaigns.view',
      },
      {
        id: 'leads',
        label: 'Leads',
        href: '/dashboard/crm/leads',
        icon: Users,
        modules: ['crm'],
        permission: 'crm.leads.view',
      },
      {
        id: 'oportunidades',
        label: 'Oportunidades',
        href: '/dashboard/crm/opportunities',
        icon: Crosshair,
        modules: ['crm'],
        permission: 'crm.opportunities.view',
      },
      {
        id: 'contactos',
        label: 'Contactos',
        href: '/dashboard/crm/contacts',
        icon: User,
        modules: ['crm'],
        permission: 'crm.contacts.view',
      },
      {
        id: 'clientes',
        label: 'Clientes',
        href: '/dashboard/crm/clients',
        icon: UserCheck,
        modules: ['crm'],
        permission: 'crm.contacts.view',
      },
      {
        id: 'calendario',
        label: 'Calendario',
        href: '/dashboard/crm/activities',
        icon: Calendar,
        modules: ['crm'],
        permission: 'crm.activities.view',
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        href: '/dashboard/crm/whatsapp',
        icon: MessageSquare,
        modules: ['crm'],
        permission: 'crm.whatsapp.view',
      },
      {
        id: 'automatizaciones',
        label: 'Automatizaciones',
        href: '/dashboard/crm/automations',
        icon: Zap,
        modules: ['crm'],
        permission: 'crm.automations.view',
      },
      // General (submenú anidado dentro de CRM)
      {
        id: 'crm-general',
        label: 'General',
        icon: BarChart3,
        modules: ['crm'],
        children: [
          {
            id: 'desempeno',
            label: 'Desempeño',
            href: '/dashboard/crm/employee-performance-v2',
            icon: TrendingUp,
            modules: ['crm'],
            permission: 'crm.reports.view',
          },
          {
            id: 'equipos',
            label: 'Equipos',
            href: '/dashboard/crm/team-management',
            icon: Users,
            modules: ['crm'],
            permission: 'crm.team.view',
          },
        ],
      },
    ],
  },

  // Propiedad Horizontal
  {
    id: 'ph',
    label: 'Propiedad Horizontal',
    icon: Building2,
    modules: ['ph'],
    children: [
      {
        id: 'ph-dashboard',
        label: 'Dashboard',
        href: '/dashboard/ph',
        icon: LayoutDashboard,
        modules: ['ph'],
        permission: 'ph.dashboard.view',
      },
      // Copropiedades (con Alquileres como sub-item)
      {
        id: 'ph-condominiums',
        label: 'Copropiedades',
        icon: Building2,
        modules: ['ph'],
        children: [
          {
            id: 'ph-condominiums-list',
            label: 'Copropiedades',
            href: '/dashboard/ph/condominiums',
            icon: Building2,
            modules: ['ph'],
            permission: 'ph.condominiums.view',
          },
          {
            id: 'ph-rentals',
            label: 'Alquileres',
            href: '/dashboard/ph/rentals',
            icon: Key,
            modules: ['ph'],
            permission: 'ph.rentals.view',
          },
        ],
      },
      {
        id: 'ph-residents',
        label: 'Copropietarios',
        altLabel: 'Vecinos',
        altLabelPermission: 'ph.residents.create',
        href: '/dashboard/ph/residents',
        icon: Users,
        modules: ['ph'],
        permission: 'ph.residents.view',
      },
      {
        id: 'ph-units',
        label: 'Unidades',
        altLabel: 'Mis Unidades',
        altLabelPermission: 'ph.units.create',
        href: '/dashboard/ph/units',
        icon: Home,
        modules: ['ph'],
        permission: 'ph.units.view',
      },
      {
        id: 'ph-vehicles',
        label: 'Vehículos',
        altLabel: 'Mis Vehículos',
        altLabelPermission: 'ph.vehicles.create',
        href: '/dashboard/ph/vehicles',
        icon: Car,
        modules: ['ph'],
        permission: 'ph.vehicles.view',
      },
      {
        id: 'ph-common-areas',
        label: 'Zonas Comunes',
        href: '/dashboard/ph/common-areas',
        icon: MapPin,
        modules: ['ph'],
        permission: 'ph.common_areas.view',
      },
      // Contabilidad (grupo)
      {
        id: 'ph-contabilidad',
        label: 'Contabilidad',
        icon: BookOpen,
        modules: ['ph'],
        children: [
          {
            id: 'ph-cartera',
            label: 'Cartera',
            href: '/dashboard/ph/cartera',
            icon: Wallet,
            modules: ['ph'],
            permission: 'ph.billing.view',
          },
          {
            id: 'ph-billing',
            label: 'Facturación',
            href: '/dashboard/ph/billing',
            icon: Receipt,
            modules: ['ph'],
            permission: 'ph.billing.manage',
          },
          {
            id: 'ph-bancos',
            label: 'Bancos',
            icon: Banknote,
            modules: ['ph'],
            permission: 'ph.billing.manage',
            disabled: true,
            badge: 'Pronto',
          },
        ],
      },
      // Administración (grupo)
      {
        id: 'ph-administracion',
        label: 'Administración',
        icon: Briefcase,
        modules: ['ph'],
        children: [
          {
            id: 'ph-asamblea',
            label: 'Asambleas',
            href: '/dashboard/ph/asambleas',
            icon: Users,
            modules: ['ph'],
            permission: 'ph.assemblies.view',
          },
          {
            id: 'ph-documentos',
            label: 'Documentos',
            href: '/dashboard/ph/documentos',
            icon: FolderOpen,
            modules: ['ph'],
            permission: 'ph.documents.view',
          },
          {
            id: 'ph-mantenimiento',
            label: 'Plan de Mantenimiento',
            href: '/dashboard/ph/mantenimiento',
            icon: Wrench,
            modules: ['ph'],
            permission: 'ph.maintenance.view',
          },
          {
            id: 'ph-polizas',
            label: 'Pólizas',
            href: '/dashboard/ph/polizas',
            icon: Shield,
            modules: ['ph'],
            permission: 'ph.policies.view',
          },
          {
            id: 'ph-porteria',
            label: 'Portería',
            href: '/dashboard/ph/porteria',
            icon: DoorOpen,
            modules: ['ph'],
            permission: 'ph.porteria.view',
          },
          {
            id: 'ph-comunicados',
            label: 'Comunicados',
            href: '/dashboard/ph/comunicados',
            icon: Megaphone,
            modules: ['ph'],
            permission: 'ph.comunicados.view',
          },
        ],
      },
      {
        id: 'ph-pqrs',
        label: 'Gestión de PQRS',
        href: '/dashboard/ph/pqrs',
        icon: HelpCircle,
        modules: ['ph'],
        permission: 'ph.pqrs.view',
      },
      {
        id: 'ph-settings',
        label: 'Configuración',
        href: '/dashboard/ph/settings',
        icon: Settings,
        modules: ['ph'],
        permission: 'ph.settings.view',
      },
    ],
  },

  // Reportes
  {
    id: 'reportes',
    label: 'Reportes',
    href: '/dashboard/reports',
    icon: BarChart3,
    modules: ['reports'],
    permission: 'reports.view',
  },

  // General
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    modules: ['company_profile', 'user_management', 'configurations', 'crm', 'ar_ap'],
    children: [
      {
        id: 'perfil-empresa',
        label: 'Perfil Empresa',
        href: '/dashboard/company-profile',
        icon: Building,
        modules: ['company_profile'],
        permission: 'company.profile.view',
      },
      {
        id: 'usuarios',
        label: 'Usuarios',
        href: '/dashboard/company-users',
        icon: UserPlus,
        modules: ['user_management'],
        permission: 'users.view',
      },
      {
        id: 'configuraciones',
        label: 'Configuraciones',
        href: '/dashboard/configurations',
        icon: Settings,
        modules: ['configurations'],
        permission: 'config.view',
      },
      {
        id: 'plantillas-email',
        label: 'Plantillas Email',
        href: '/dashboard/email-templates',
        icon: Mail,
        modules: ['crm', 'ar_ap'],
        permission: 'templates.email.view',
      },
      {
        id: 'plantillas-whatsapp',
        label: 'Plantillas WhatsApp',
        href: '/dashboard/whatsapp-templates',
        icon: FileText,
        modules: ['crm', 'ar_ap'],
        permission: 'templates.whatsapp.view',
      },
    ],
  },
];

// Función helper para verificar si un item debe mostrarse según los módulos y permisos
// El backend ya resuelve permisos según rol (owner/admin tienen todas las acciones de sus módulos)
export function shouldShowNavItem(
  item: NavItemConfig,
  enabledModules: string[],
  userActions: string[]
): boolean {
  // Verificar módulos (si tiene)
  if (item.modules && item.modules.length > 0) {
    const hasModule = item.modules.some((module) => enabledModules.includes(module));
    if (!hasModule) return false;
  }

  // Verificar permiso específico (si tiene)
  if (item.permission) {
    if (!userActions.includes(item.permission)) return false;
  }

  // Verificar cualquiera de los permisos (OR)
  if (item.anyPermission && item.anyPermission.length > 0) {
    const hasAny = item.anyPermission.some((p) => userActions.includes(p));
    if (!hasAny) return false;
  }

  return true;
}

// Lista de todos los módulos disponibles (para desarrollo con mock)
export const ALL_MODULES = [
  'dashboard',
  'sales',
  'inventory',
  'purchases',
  'expenses',
  'third_parties',
  'ar_ap',
  'accounting',
  'banking',
  'fixed_assets',
  'point_of_sale',
  'cash_registers',
  'cost_centers',
  'core_hr',
  'time_attendance',
  'leaves_vacations',
  'hr_payroll',
  'hr_expenses',
  'hr_performance',
  'hr_portal',
  'electronic_documents',
  'crm',
  'tax',
  'reports',
  'company_profile',
  'user_management',
  'configurations',
  'ph',
];
