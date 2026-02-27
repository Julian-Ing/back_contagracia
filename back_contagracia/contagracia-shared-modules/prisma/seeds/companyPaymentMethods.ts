import { PrismaClient } from '@prisma/client-master';

/**
 * Métodos de pago personalizados por defecto para tenants
 * payment_method_code hace referencia al código DIAN en PaymentMethod
 * consecutive se asigna con prefijo MP + orden (MP-0001, MP-0002, etc.)
 */
export const companyPaymentMethods = [
  { id: '1', payment_method_code: '42', name: 'Transferencia Bancaria', description: 'Consignación o transferencia bancaria', consecutive: 'MP-0001' },
  { id: '2', payment_method_code: '10', name: 'Efectivo', description: 'Pago en efectivo', consecutive: 'MP-0002' },
  { id: '3', payment_method_code: '20', name: 'Cheque', description: 'Pago con cheque', consecutive: 'MP-0003' },
  { id: '4', payment_method_code: '48', name: 'Tarjeta Crédito', description: 'Pago con tarjeta de crédito', consecutive: 'MP-0004' },
  { id: '5', payment_method_code: '49', name: 'Tarjeta Débito', description: 'Pago con tarjeta débito', consecutive: 'MP-0005' },
];

export async function seedCompanyPaymentMethods(prisma: PrismaClient) {
  console.log('💳 Seeding Company Payment Methods...');

  for (const cpm of companyPaymentMethods) {
    await prisma.companyPaymentMethod.upsert({
      where: { id: cpm.id },
      update: { name: cpm.name, description: cpm.description, consecutive: cpm.consecutive },
      create: cpm,
    });
  }

  console.log(`   ✅ ${companyPaymentMethods.length} métodos de pago personalizados creados\n`);
}
