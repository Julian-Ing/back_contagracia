/**
 * Tipos de Operación DIAN - Colombia
 * Clasificación de operaciones para facturación electrónica
 */
export const typeOperations = [
  // Facturación
  { id: '1',  code: '01', name: 'Combustibles' },
  { id: '2',  code: '02', name: 'Emisor es Autorretenedor' },
  { id: '3',  code: '03', name: 'Excluidos y Exentos' },
  { id: '4',  code: '04', name: 'Exportación' },
  { id: '5',  code: '05', name: 'Genérica' },
  { id: '6',  code: '06', name: 'Genérica con pago anticipado' },
  { id: '7',  code: '07', name: 'Genérica con periodo de facturación' },
  { id: '8',  code: '08', name: 'Consorcio' },
  { id: '9',  code: '09', name: 'AIU' },
  { id: '10', code: '10', name: 'Estándar' },
  { id: '11', code: '11', name: 'Mandatos' },
  { id: '12', code: '12', name: 'Mandatos Servicios' },

  // Cambiario / Divisas (códigos 10-16 en contexto cambiario)
  { id: '13', code: '13', name: 'Cambiario' },
  { id: '14', code: '14', name: 'Notarios' },
  { id: '15', code: '15', name: 'Compra Divisas' },
  { id: '16', code: '16', name: 'Venta Divisas' },

  // Notas Crédito
  { id: '17', code: '20', name: 'Nota Crédito que referencia una factura electrónica' },
  { id: '18', code: '22', name: 'Nota Crédito sin referencia a facturas' },
  { id: '19', code: '23', name: 'Nota Crédito para facturación electrónica V1 (Decreto 2242)' },

  // Notas de ajuste Doc. Equivalente
  { id: '20', code: '25', name: 'Nota de ajuste al Doc. Equivalente — Boleta de ingreso a cine' },

  // Notas Débito
  { id: '21', code: '30', name: 'Nota Débito que referencia una factura electrónica' },
  { id: '22', code: '32', name: 'Nota Débito sin referencia a facturas' },
  { id: '23', code: '33', name: 'Nota Débito para facturación electrónica V1 (Decreto 2242)' },

  // Notas de ajuste Doc. Equivalente (continuación)
  { id: '24', code: '35', name: 'Nota de ajuste al Doc. Equivalente — Tiquete transporte terrestre' },
  { id: '25', code: '60', name: 'Nota de ajuste al Doc. Equivalente — Servicios Públicos Domiciliarios' },

  // Facturación electrónica
  { id: '26', code: '601', name: 'Facturación Normal' },
  { id: '27', code: '602', name: 'Facturación en Sitio' },
];
