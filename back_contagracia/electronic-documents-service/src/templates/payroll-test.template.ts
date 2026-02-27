/**
 * Template para Nómina de Prueba - Test Set DIAN
 *
 * Este JSON se envía a POST /api/ubl2.1/payroll/{testSetId}
 * Se envían 10 nóminas consecutivas (consecutive 1-10) para validar
 * el set de pruebas de nómina electrónica.
 */

export interface PayrollTestTemplateParams {
  // DATOS DINÁMICOS
  consecutive: number;                  // 1 a 10 (se envían 10 nóminas)
  prefix: string;                       // "TNI" (prueba) o "NI" (producción)
  currentDate: string;                  // Formato: YYYY-MM-DD (Colombia timezone)
}

export function buildPayrollTestTemplate(params: PayrollTestTemplateParams) {
  return {
    // ==========================================
    // TIPO DE DOCUMENTO
    // ==========================================
    type_document_id: 9,                         // Hardcoded: 9 = Nómina Electrónica

    // ==========================================
    // CABECERA DEL DOCUMENTO
    // ==========================================
    head_note: "REPRESENTACION GRAFICA DE NOMINA ELECTRONICA",  // Hardcoded
    foot_note: "PIE DE PAGINA NOMINA ELECTRONICA",              // Hardcoded
    type_note: 1,                                // Hardcoded: 1 = Normal, 2 = Anulación

    // ==========================================
    // NUMERACIÓN
    // ==========================================
    prefix: params.prefix,                       // "TNI" (prueba) o "NI" (producción)
    consecutive: params.consecutive,             // 1 a 10 (dinámico)
    resolution_number: "18760000001",            // Hardcoded: Número de resolución de prueba

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    sendmail: true,                              // Hardcoded: true para pruebas
    sendmailtome: false,                         // Hardcoded: false

    // ==========================================
    // NOVEDAD (sin novedad para prueba)
    // ==========================================
    novelty: {
      novelty: false,                            // Hardcoded: false = sin novedad
      uuidnov: null,                             // Hardcoded: null
    },

    // ==========================================
    // PERIODO DE LIQUIDACIÓN
    // ==========================================
    period: {
      admision_date: "2025-01-01",               // Hardcoded: Fecha de admisión de prueba
      settlement_start_date: "2025-09-01",       // Hardcoded: Inicio del periodo
      settlement_end_date: "2025-09-17",         // Hardcoded: Fin del periodo
      worked_time: "15.00",                      // Hardcoded: 15 días trabajados
      issue_date: params.currentDate,            // Generado: Fecha actual (Colombia)
    },

    // ==========================================
    // DATOS DEL TRABAJADOR
    // Hardcoded: Empleado de prueba
    // ==========================================
    worker_code: "1117488256",                   // Hardcoded: Código del trabajador
    payroll_period_id: 5,                        // Hardcoded: 5 = Quincenal

    worker: {
      type_worker_id: 1,                         // Hardcoded: 1 = Empleado
      sub_type_worker_id: 1,                     // Hardcoded: 1 = Dependiente
      payroll_type_document_identification_id: 3,// Hardcoded: 3 = Cédula de Ciudadanía
      type_document_identification_id: 3,        // Hardcoded: 3 = Cédula de Ciudadanía
      identification_number: 1117488256,         // Hardcoded: CC del empleado de prueba
      surname: "SAENZ",                          // Hardcoded: Apellido
      second_surname: "SALAS",                   // Hardcoded: Segundo apellido
      first_name: "CRISTIAN",                    // Hardcoded: Primer nombre
      middle_name: "LEANDRO",                    // Hardcoded: Segundo nombre
      address: "CRA 2 6 39",                     // Hardcoded: Dirección
      municipality_id: 346,                      // Hardcoded: 346 = Municipio de prueba
      type_contract_id: 1,                       // Hardcoded: 1 = Contrato a término indefinido
      high_risk_pension: false,                  // Hardcoded: false
      integral_salarary: false,                  // Hardcoded: false = salario no integral
      salary: "1423500.00",                      // Hardcoded: Salario mensual de prueba
    },

    // ==========================================
    // MÉTODO DE PAGO
    // ==========================================
    payment: {
      payment_method_id: 42,                     // Hardcoded: 42 = Transferencia bancaria
      bank_name: "NEQUI",                        // Hardcoded: Banco de prueba
      account_type: "AHORROS",                   // Hardcoded: Tipo de cuenta
      account_number: "3144722318",              // Hardcoded: Número de cuenta de prueba
    },

    // ==========================================
    // FECHAS DE PAGO
    // ==========================================
    payment_dates: [
      {
        payment_date: "2025-09-10",              // Hardcoded: Fecha de pago de prueba
      },
    ],

    // ==========================================
    // DEVENGADOS
    // Hardcoded: Conceptos de prueba
    // ==========================================
    accrued: {
      worked_days: 15,                           // Hardcoded: 15 días trabajados
      salary: "0.00",                            // Hardcoded: $0 (salario en otros conceptos)

      // Vacaciones pagadas
      paid_vacation: [
        {
          quantity: 11,                          // Hardcoded: 11 días de vacaciones
          payment: "510100.00",                  // Hardcoded: $510,100
        },
      ],

      // Prima de servicios
      service_bonus: [
        {
          quantity: 6,                           // Hardcoded: 6 meses
          payment: "316300.00",                  // Hardcoded: $316,300
          paymentNS: "0.00",                     // Hardcoded: $0 no salarial
        },
      ],

      // Cesantías e intereses
      severance: [
        {
          payment: "1200500.00",                 // Hardcoded: $1,200,500 cesantías
          percentage: "12.00",                   // Hardcoded: 12% intereses
          interest_payment: "95070.45",          // Hardcoded: $95,070.45 intereses
        },
      ],

      // Incapacidades
      work_disabilities: [
        {
          start_date: "2025-09-01",              // Hardcoded: Inicio incapacidad
          end_date: "2025-09-15",                // Hardcoded: Fin incapacidad
          type: 1,                               // Hardcoded: 1 = Común
          quantity: 15,                          // Hardcoded: 15 días
          payment: "474523.80",                  // Hardcoded: $474,523.80
        },
      ],

      // Anticipos (devengado)
      advances: [
        {
          advance: "1000000.00",                 // Hardcoded: $1,000,000 anticipo
        },
      ],

      accrued_total: "2596494.25",               // Hardcoded: Total devengado
    },

    // ==========================================
    // DEDUCCIONES
    // Hardcoded: Conceptos de deducción de prueba
    // ==========================================
    deductions: {
      // Seguridad social
      eps_type_law_deductions_id: 1,             // Hardcoded: 1 = EPS
      eps_deduction: "0.00",                     // Hardcoded: $0 (para prueba)
      pension_type_law_deductions_id: 5,         // Hardcoded: 5 = Pensión
      pension_deduction: "0.00",                 // Hardcoded: $0 (para prueba)

      // Otras deducciones
      debt: "654810.00",                         // Hardcoded: $654,810 deudas

      // Anticipos (deducción)
      advances: [
        {
          advance: "1000000.00",                 // Hardcoded: $1,000,000 anticipo
        },
      ],

      deductions_total: "1654810.00",            // Hardcoded: Total deducido
    },

    // ==========================================
    // NOTAS
    // ==========================================
    notes: "Generado desde EL DJ",               // Hardcoded: Nota de prueba
  };
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 *
 * 1. Este template es para VALIDACIÓN de test set de nómina.
 * 2. Se envían 10 nóminas con consecutive 1 a 10.
 * 3. Los datos del trabajador y montos son fijos para pruebas DIAN.
 * 4. Los datos del establecimiento vienen de Master DB (companies).
 * 5. El prefix cambia según ambiente: "TNI" (prueba) o "NI" (producción).
 * 6. Cada nómina enviada retorna un CUNE que se guarda para las notas de ajuste.
 *
 * ENDPOINT: POST /api/ubl2.1/payroll/{testSetId}
 * RESPUESTA ESPERADA: { CUNE: string, message: "generada con éxito" }
 *
 * ORIGEN DE DATOS:
 * - Master DB (companies): establishment_name, establishment_address, establishment_phone,
 *                          establishment_municipality, establishment_email
 * - Parámetros: consecutive (1-10), prefix (TNI/NI), currentDate
 * - Hardcoded: worker, accrued, deductions, period, payment
 *
 * FLUJO:
 * 1. Enviar 10 nóminas con consecutive 1 a 10
 * 2. Guardar CUNE de cada nómina retornada
 * 3. Usar CUNEs para enviar 8 notas de ajuste (anulaciones)
 */
