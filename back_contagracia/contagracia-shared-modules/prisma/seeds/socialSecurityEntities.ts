/**
 * Entidades de Seguridad Social - Colombia
 * Se crean como ThirdParty con roles EPS, PENSION_FUND, ARL, etc.
 *
 * Tipos de entidades:
 * - EPS: Entidades Promotoras de Salud
 * - PENSION_FUND: Fondos de Pensiones
 * - ARL: Administradoras de Riesgos Laborales
 * - COMPENSATION_FUND: Cajas de Compensación Familiar
 * - SEVERANCE_FUND: Fondos de Cesantías
 */
export const socialSecurityEntities = [
  // ========== EPS ==========
  {
    name: 'EPS Sura',
    identification_number: '800088702',
    roles: ['EPS'],
    codigo_pila: 'EPS001',
    is_active: true,
  },
  {
    name: 'Nueva EPS',
    identification_number: '900156264',
    roles: ['EPS'],
    codigo_pila: 'EPS002',
    is_active: true,
  },
  {
    name: 'Sanitas',
    identification_number: '800251440',
    roles: ['EPS'],
    codigo_pila: 'EPS005',
    is_active: true,
  },
  {
    name: 'Compensar EPS',
    identification_number: '860066942',
    roles: ['EPS'],
    codigo_pila: 'EPS008',
    is_active: true,
  },
  {
    name: 'Famisanar',
    identification_number: '830003564',
    roles: ['EPS'],
    codigo_pila: 'EPS017',
    is_active: true,
  },
  {
    name: 'Salud Total',
    identification_number: '800130907',
    roles: ['EPS'],
    codigo_pila: 'EPS037',
    is_active: true,
  },
  {
    name: 'Coomeva EPS',
    identification_number: '805000427',
    roles: ['EPS'],
    codigo_pila: 'EPS016',
    is_active: true,
  },
  {
    name: 'Aliansalud',
    identification_number: '830113831',
    roles: ['EPS'],
    codigo_pila: 'EPS010',
    is_active: true,
  },

  // ========== FONDOS DE PENSIONES ==========
  {
    name: 'Porvenir',
    identification_number: '800144331',
    roles: ['PENSION_FUND'],
    codigo_pila: 'AFP001',
    is_active: true,
  },
  {
    name: 'Protección',
    identification_number: '800138188',
    roles: ['PENSION_FUND'],
    codigo_pila: 'AFP002',
    is_active: true,
  },
  {
    name: 'Colfondos',
    identification_number: '800198644',
    roles: ['PENSION_FUND'],
    codigo_pila: 'AFP003',
    is_active: true,
  },
  {
    name: 'Old Mutual (Skandia)',
    identification_number: '800185741',
    roles: ['PENSION_FUND'],
    codigo_pila: 'AFP004',
    is_active: true,
  },
  {
    name: 'Colpensiones',
    identification_number: '900336004',
    roles: ['PENSION_FUND'],
    codigo_pila: 'CCF001',
    is_active: true,
  },

  // ========== ARL ==========
  {
    name: 'Sura ARL',
    identification_number: '890903790',
    roles: ['ARL'],
    codigo_pila: 'ARL001',
    is_active: true,
  },
  {
    name: 'Positiva',
    identification_number: '860011153',
    roles: ['ARL'],
    codigo_pila: 'ARL002',
    is_active: true,
  },
  {
    name: 'Colmena ARL',
    identification_number: '860002183',
    roles: ['ARL'],
    codigo_pila: 'ARL003',
    is_active: true,
  },
  {
    name: 'AXA Colpatria ARL',
    identification_number: '860002503',
    roles: ['ARL'],
    codigo_pila: 'ARL004',
    is_active: true,
  },
  {
    name: 'Liberty ARL',
    identification_number: '860039988',
    roles: ['ARL'],
    codigo_pila: 'ARL005',
    is_active: true,
  },
  {
    name: 'Bolívar ARL',
    identification_number: '860002964',
    roles: ['ARL'],
    codigo_pila: 'ARL006',
    is_active: true,
  },

  // ========== CAJAS DE COMPENSACION ==========
  {
    name: 'Compensar',
    identification_number: '860066943',
    roles: ['COMPENSATION_FUND'],
    codigo_pila: 'CCF001',
    is_active: true,
  },
  {
    name: 'Colsubsidio',
    identification_number: '860007336',
    roles: ['COMPENSATION_FUND'],
    codigo_pila: 'CCF002',
    is_active: true,
  },
  {
    name: 'Cafam',
    identification_number: '860013570',
    roles: ['COMPENSATION_FUND'],
    codigo_pila: 'CCF003',
    is_active: true,
  },
  {
    name: 'Comfenalco Antioquia',
    identification_number: '890900842',
    roles: ['COMPENSATION_FUND'],
    codigo_pila: 'CCF004',
    is_active: true,
  },
  {
    name: 'Comfandi',
    identification_number: '890300466',
    roles: ['COMPENSATION_FUND'],
    codigo_pila: 'CCF005',
    is_active: true,
  },

  // ========== FONDOS DE CESANTIAS ==========
  {
    name: 'Fondo Porvenir Cesantías',
    identification_number: '800144332',
    roles: ['SEVERANCE_FUND'],
    codigo_pila: 'CES001',
    is_active: true,
  },
  {
    name: 'Protección Cesantías',
    identification_number: '800138189',
    roles: ['SEVERANCE_FUND'],
    codigo_pila: 'CES002',
    is_active: true,
  },
  {
    name: 'Colfondos Cesantías',
    identification_number: '800198645',
    roles: ['SEVERANCE_FUND'],
    codigo_pila: 'CES003',
    is_active: true,
  },
  {
    name: 'FNA (Fondo Nacional del Ahorro)',
    identification_number: '899999284',
    roles: ['SEVERANCE_FUND'],
    codigo_pila: 'CES004',
    is_active: true,
  },
];
