/**
 * Template para Factura de Prueba - Test Set DIAN
 *
 * Este JSON se envía a POST /api/ubl2.1/invoice/{testSetId}
 * para validar el set de pruebas de facturación electrónica.
 */

export interface InvoiceTestTemplateParams {
  // DATOS DE LA COMPAÑÍA EMISORA - De Master DB
  // Tabla: companies (Master)
  establishment_name: string;           // companies.company_name
  establishment_address: string;        // companies.address
  establishment_phone: string;          // companies.phone
  establishment_municipality: number;   // companies.municipality_id
  establishment_email: string;          // companies.email

  // DATOS DE LA RESOLUCIÓN
  // Tabla: Resolution (Tenant)
  prefix: string;                       // Resolution.prefix
  resolutionNumber: string;             // Resolution.resolution_number
  nextConsecutive: number;              // Resolution.last_external_consecutive + 1

  // FECHAS (generadas dinámicamente)
  currentDate: string;                  // Formato: YYYY-MM-DD (Colombia timezone)
  currentTime: string;                  // Formato: HH:mm:ss (Colombia timezone)
}

export function buildInvoiceTestTemplate(params: InvoiceTestTemplateParams) {
  return {
    // ==========================================
    // DATOS DEL ESTABLECIMIENTO EMISOR
    // Fuente: Master DB - companies
    // ==========================================
    establishment_name: params.establishment_name,           // companies.company_name
    establishment_address: params.establishment_address,     // companies.address
    establishment_phone: params.establishment_phone,         // companies.phone
    establishment_municipality: params.establishment_municipality, // companies.municipality_id
    establishment_email: params.establishment_email,         // companies.email

    // ==========================================
    // DATOS DEL DOCUMENTO
    // Fuente: Resolution (Tenant) + generados
    // ==========================================
    date: params.currentDate,                    // Generado: Colombia date (America/Bogota)
    time: params.currentTime,                    // Generado: Colombia time (America/Bogota)
    number: params.nextConsecutive,              // Resolution.last_external_consecutive + 1
    prefix: params.prefix,                       // Resolution.prefix
    resolution_number: params.resolutionNumber,  // Resolution.resolution_number
    type_document_id: 1,                         // Hardcoded: 1 = Factura de Venta Nacional

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    notes: "Factura de prueba para validación DIAN",  // Hardcoded
    sendmail: false,                             // Hardcoded: No enviar email en pruebas

    // ==========================================
    // CLIENTE DE PRUEBA
    // Hardcoded: Datos fijos requeridos por DIAN para test
    // ==========================================
    customer: {
      type_document_identification_id: 6,        // Hardcoded: 6 = Cédula de Ciudadanía
      identification_number: 675382,             // Hardcoded: NIT de prueba
      dv: 5,                                     // Hardcoded: DV de prueba
      name: "justo fidel soto m",                // Hardcoded: Cliente de prueba DIAN
      email: "jufisome@hotmail.com",             // Hardcoded: Email de prueba
      phone: "2222222222",                       // Hardcoded: Teléfono de prueba
      address: "Calle 00 0000",                  // Hardcoded: Dirección de prueba
      municipality_id: 127,                      // Hardcoded: 127 = Bogotá D.C.
      type_regime_id: 1,                         // Hardcoded: 1 = Régimen Común
      type_liability_id: 117,                    // Hardcoded: 117 = Responsable de IVA
      type_organization_id: 1,                   // Hardcoded: 1 = Persona Jurídica
      merchant_registration: "0000",             // Hardcoded: Matrícula mercantil
    },

    // ==========================================
    // LÍNEAS DE FACTURA
    // Hardcoded: Producto de prueba
    // ==========================================
    invoice_lines: [
      {
        // Identificación del producto
        code: "19900142-cf50-44a6-9023-c674c85393cc",  // Hardcoded: UUID de prueba
        description: "empanada",                       // Hardcoded: Producto de prueba
        type_item_identification_id: 4,                // Hardcoded: 4 = Estándar
        unit_measure_id: 70,                           // Hardcoded: 70 = Unidad

        // Cantidades y precios
        invoiced_quantity: "1",                        // Hardcoded: 1 unidad
        base_quantity: "1",                            // Hardcoded: Base
        price_amount: 12000,                           // Hardcoded: $12,000 precio unitario
        line_extension_amount: 12000,                  // Hardcoded: $12,000 subtotal línea
        free_of_charge_indicator: false,               // Hardcoded: No es gratis

        // Descuentos (sin descuento para prueba)
        allowance_charges: [
          {
            charge_indicator: false,                   // false = descuento, true = cargo
            allowance_charge_reason: "SIN DESCUENTO",  // Hardcoded: Sin descuento
            amount: "0.0000",                          // Hardcoded: $0
            base_amount: "12000",                      // Hardcoded: Base para descuento
          },
        ],

        // Impuestos de la línea
        tax_totals: [
          {
            tax_id: 1,                                 // Hardcoded: 1 = IVA
            percent: "50",                             // Hardcoded: 50% (prueba con % alto)
            taxable_amount: "12000",                   // Hardcoded: Base gravable $12,000
            tax_amount: "6000",                        // Hardcoded: IVA $6,000 (50% de 12,000)
          },
        ],
      },
    ],

    // ==========================================
    // TOTALES DE IMPUESTOS (nivel documento)
    // Hardcoded: Consolidado de impuestos
    // ==========================================
    tax_totals: [
      {
        tax_id: 1,                                     // Hardcoded: 1 = IVA
        percent: "50",                                 // Hardcoded: 50%
        taxable_amount: "12000",                       // Hardcoded: Base gravable total
        tax_amount: "6000",                            // Hardcoded: IVA total
      },
    ],

    // ==========================================
    // RETENCIONES
    // Hardcoded: Vacío para prueba
    // ==========================================
    with_holding_tax_total: [],                        // Hardcoded: Sin retenciones

    // ==========================================
    // TOTALES MONETARIOS
    // Hardcoded: Consolidado financiero
    // ==========================================
    legal_monetary_totals: {
      line_extension_amount: "12000",                  // Hardcoded: Subtotal sin IVA
      tax_exclusive_amount: "12000",                   // Hardcoded: Base antes de IVA
      tax_inclusive_amount: "18000",                   // Hardcoded: Total con IVA ($12,000 + $6,000)
      payable_amount: "18000",                         // Hardcoded: Total a pagar
    },

    // ==========================================
    // FORMA DE PAGO
    // Hardcoded: Contado
    // ==========================================
    payment_form: {
      payment_form_id: 1,                              // Hardcoded: 1 = Contado
      payment_method_id: 10,                           // Hardcoded: 10 = Efectivo
      payment_due_date: params.currentDate,            // Colombia date (mismo día)
      duration_measure: 0,                             // Hardcoded: 0 días (contado)
    },
  };
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 *
 * 1. Este template es específico para VALIDACIÓN de test set, no para facturas reales.
 * 2. Los datos del cliente y producto son fijos según requerimientos DIAN.
 * 3. Los datos del establecimiento emisor vienen de Master DB (companies).
 * 4. Solo se personalizan: establishment_*, prefix, resolution_number, consecutive, date, time.
 * 5. El IVA de 50% es intencional para pruebas (facilita validación).
 * 6. No incluye descuentos ni retenciones para simplicidad.
 *
 * ENDPOINT: POST /api/ubl2.1/invoice/{testSetId}
 * RESPUESTA ESPERADA: { ZipKey: string } para posterior consulta de estado
 *
 * ORIGEN DE DATOS:
 * - Master DB (companies): establishment_name, establishment_address, establishment_phone,
 *                          establishment_municipality, establishment_email
 * - Tenant DB (Resolution): prefix, resolution_number, last_external_consecutive
 * - Generado: currentDate, currentTime (America/Bogota timezone)
 * - Hardcoded: customer, invoice_lines, tax_totals, payment_form
 */
