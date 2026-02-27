/**
 * Tabla de Retención en la Fuente por UVT - Colombia 2025
 * Art. 383 del Estatuto Tributario
 * Procedimiento 1
 */

// Tramos de retención en la fuente - Procedimiento 1 (Art. 383 ET)
export const PAYROLL_WITHHOLDING_UVT = [
  {
    year: 2025,
    procedure: 1,
    from_uvt: '0.00',
    to_uvt: '95.00',
    fixed_fee_uvt: '0.00',
    marginal_rate: '0.000000',
    subtract_uvt: '0.00',
  },
  {
    year: 2025,
    procedure: 1,
    from_uvt: '95.00',
    to_uvt: '150.00',
    fixed_fee_uvt: '0.00',
    marginal_rate: '0.190000',
    subtract_uvt: '95.00',
  },
  {
    year: 2025,
    procedure: 1,
    from_uvt: '150.00',
    to_uvt: '360.00',
    fixed_fee_uvt: '10.45',
    marginal_rate: '0.280000',
    subtract_uvt: '150.00',
  },
  {
    year: 2025,
    procedure: 1,
    from_uvt: '360.00',
    to_uvt: '640.00',
    fixed_fee_uvt: '69.25',
    marginal_rate: '0.330000',
    subtract_uvt: '360.00',
  },
  {
    year: 2025,
    procedure: 1,
    from_uvt: '640.00',
    to_uvt: '945.00',
    fixed_fee_uvt: '161.65',
    marginal_rate: '0.350000',
    subtract_uvt: '640.00',
  },
  {
    year: 2025,
    procedure: 1,
    from_uvt: '945.00',
    to_uvt: '2300.00',
    fixed_fee_uvt: '268.40',
    marginal_rate: '0.370000',
    subtract_uvt: '945.00',
  },
  {
    year: 2025,
    procedure: 1,
    from_uvt: '2300.00',
    to_uvt: null, // Último tramo sin límite superior
    fixed_fee_uvt: '769.75',
    marginal_rate: '0.390000',
    subtract_uvt: '2300.00',
  },
];

export async function seedPayrollWithholdingUvt(prisma: any) {
  console.log('Seeding Payroll Withholding UVT...');

  for (const item of PAYROLL_WITHHOLDING_UVT) {
    await prisma.payrollWithholdingUvt.upsert({
      where: {
        year_procedure_from_uvt: {
          year: item.year,
          procedure: item.procedure,
          from_uvt: item.from_uvt,
        },
      },
      update: {
        to_uvt: item.to_uvt,
        fixed_fee_uvt: item.fixed_fee_uvt,
        marginal_rate: item.marginal_rate,
        subtract_uvt: item.subtract_uvt,
      },
      create: {
        year: item.year,
        procedure: item.procedure,
        from_uvt: item.from_uvt,
        to_uvt: item.to_uvt,
        fixed_fee_uvt: item.fixed_fee_uvt,
        marginal_rate: item.marginal_rate,
        subtract_uvt: item.subtract_uvt,
      },
    });
  }

  console.log(`   ${PAYROLL_WITHHOLDING_UVT.length} tramos UVT creados`);
}
