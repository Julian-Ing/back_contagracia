export interface DomainModuleContext {
  data: any;
  instructions: string[];
  description: string;
}

export interface DomainModule {
  moduleId: string;
  getContext(companyId: string, query: string): Promise<DomainModuleContext>;
}

export const AI_MODULES = [
  { id: 'general', name: 'General', emoji: '💬', description: 'Consultas generales', enabled: true },
  { id: 'crm', name: 'CRM', emoji: '🎯', description: 'Leads y oportunidades', enabled: true },
  { id: 'ingresos', name: 'Ingresos', emoji: '💰', description: 'Ventas y facturación', enabled: false },
  { id: 'gastos', name: 'Gastos', emoji: '📉', description: 'Compras y proveedores', enabled: false },
  { id: 'cartera', name: 'Cartera', emoji: '💳', description: 'Cuentas por cobrar', enabled: false },
  { id: 'bancos', name: 'Bancos', emoji: '🏦', description: 'Cuentas bancarias', enabled: false },
  { id: 'impuestos', name: 'Impuestos', emoji: '📊', description: 'IVA y retenciones', enabled: false },
  { id: 'inventarios', name: 'Inventarios', emoji: '📦', description: 'Stock y productos', enabled: false },
  { id: 'contabilidad', name: 'Contabilidad', emoji: '📒', description: 'Asientos y PUC', enabled: false },
  { id: 'centros_costo', name: 'C. Costo', emoji: '🏢', description: 'Proyectos y presupuestos', enabled: false },
  { id: 'nomina', name: 'Nómina', emoji: '👥', description: 'Empleados y liquidaciones', enabled: false },
  { id: 'situacion_financiera', name: 'Financiero', emoji: '📈', description: 'Reportes financieros', enabled: false },
];
