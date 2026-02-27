/**
 * Tipos de Documento DIAN - Colombia
 * Tipos de documentos electrónicos para facturación electrónica
 */
export const typeDocuments = [
  { id: '1', code: '01', name: 'Factura de Venta Nacional', cufe_algorithm: 'CUFE-SHA384', prefix: 'fv', display_order: 1, is_active: true },
  { id: '2', code: '02', name: 'Factura de Exportación', cufe_algorithm: 'CUFE-SHA384', prefix: 'fv', display_order: 2, is_active: true },
  { id: '3', code: '03', name: 'Factura de Contingencia', cufe_algorithm: 'CUDE-SHA384', prefix: 'fv', display_order: 3, is_active: true },
  { id: '4', code: '91', name: 'Nota Crédito', cufe_algorithm: 'CUDE-SHA384', prefix: 'nc', display_order: 4, is_active: true },
  { id: '5', code: '92', name: 'Nota Débito', cufe_algorithm: 'CUDE-SHA384', prefix: 'nd', display_order: 5, is_active: true },
  { id: '6', code: '', name: 'ZIP', cufe_algorithm: '', prefix: 'z', display_order: 6, is_active: true },
  { id: '7', code: '89', name: 'AttachedDocument', cufe_algorithm: '', prefix: 'at', display_order: 7, is_active: true },
  { id: '8', code: '88', name: 'ApplicationResponse', cufe_algorithm: 'CUDE-SHA384', prefix: 'ar', display_order: 8, is_active: true },
  { id: '9', code: '1', name: 'Nomina Individual', cufe_algorithm: 'CUNE-SHA384', prefix: 'ni', display_order: 9, is_active: true },
  { id: '10', code: '2', name: 'Nomina Individual de Ajuste', cufe_algorithm: 'CUNE-SHA384', prefix: 'na', display_order: 10, is_active: true },
  { id: '11', code: '05', name: 'Documento Soporte Electrónico', cufe_algorithm: 'CUDS-SHA384', prefix: 'dse', display_order: 11, is_active: true },
  { id: '12', code: '04', name: 'Factura electrónica de Venta - tipo 04', cufe_algorithm: 'CUFE-SHA384', prefix: 'fv', display_order: 12, is_active: true },
  { id: '13', code: '95', name: 'Nota de Ajuste al Documento Soporte Electrónico', cufe_algorithm: 'CUDS-SHA384', prefix: 'nds', display_order: 13, is_active: true },
  { id: '14', code: '96', name: 'Eventos (ApplicationResponse)', cufe_algorithm: null, prefix: null, display_order: 14, is_active: true },
  { id: '15', code: '20', name: 'Documento equivalente electrónico del tiquete de máquina registradora con sistema P.O.S.', cufe_algorithm: 'CUDE-SHA384', prefix: 'pos', display_order: 15, is_active: true },
  { id: '16', code: '25', name: 'Boleta de ingreso a cine', cufe_algorithm: 'CUDE-SHA384', prefix: 'cin', display_order: 16, is_active: true },
  { id: '17', code: '27', name: 'Boleta de ingreso a espectáculos públicos', cufe_algorithm: 'CUDE-SHA384', prefix: 'esp', display_order: 17, is_active: true },
  { id: '18', code: '30', name: 'Documento en juegos localizados y no localizados - relación diaria de control de ventas', cufe_algorithm: 'CUDE-SHA384', prefix: 'jue', display_order: 18, is_active: true },
  { id: '19', code: '35', name: 'Tiquete de transporte de pasajeros Terrestre', cufe_algorithm: 'CUDE-SHA384', prefix: 'ttr', display_order: 19, is_active: true },
  { id: '20', code: '40', name: 'Documento expedido para el cobro de peajes', cufe_algorithm: 'CUDE-SHA384', prefix: 'pjs', display_order: 20, is_active: true },
  { id: '21', code: '45', name: 'Extracto Expedido por Sociedades Financieras y Fondos', cufe_algorithm: 'CUDE-SHA384', prefix: 'ext', display_order: 21, is_active: true },
  { id: '22', code: '50', name: 'Tiquete de Billete de Transporte Aéreo de Pasajeros', cufe_algorithm: 'CUDE-SHA384', prefix: 'tae', display_order: 22, is_active: true },
  { id: '23', code: '55', name: 'Documento de Operación de Bolsa de Valores, Agropecuaria y de Otros Comodities', cufe_algorithm: 'CUDE-SHA384', prefix: 'bls', display_order: 23, is_active: true },
  { id: '24', code: '60', name: 'Documento Expedido para los Servicios Públicos y Domiciliarios', cufe_algorithm: 'CUDE-SHA384', prefix: 'srv', display_order: 24, is_active: true },
  { id: '25', code: '93', name: 'Nota de Ajuste de tipo debito al Documento Equivalente', cufe_algorithm: 'CUDE-SHA384', prefix: 'ndq', display_order: 25, is_active: true },
  { id: '26', code: '94', name: 'Nota de Ajuste de tipo crédito al Documento Equivalente', cufe_algorithm: 'CUDE-SHA384', prefix: 'ncq', display_order: 26, is_active: true },
];
