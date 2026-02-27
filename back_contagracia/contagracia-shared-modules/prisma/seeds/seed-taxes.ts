import { PrismaClient } from '@prisma/client-master';

const taxTypes = [
  { id: 1, code: '01', name: 'IVA', description: 'Impuesto sobre las Ventas', is_tax: true },
  { id: 4, code: '04', name: 'INC', description: 'Impuesto Nacional al Consumo', is_tax: true },
  { id: 5, code: '05', name: 'ReteIVA', description: 'Retención sobre el IVA', is_tax: false },
  { id: 6, code: '06', name: 'ReteRenta', description: 'Retención sobre Renta', is_tax: false },
  { id: 7, code: '07', name: 'ReteICA', description: 'Retención sobre el ICA', is_tax: false },
  { id: 8, code: '20', name: 'FtoHorticultura', description: 'Cuota de Fomento Hortifrutícula', is_tax: true },
  { id: 9, code: '21', name: 'Timbre', description: 'Impuesto de Timbre', is_tax: true },
  { id: 10, code: '22', name: 'INC Bolsas', description: 'Impuesto al Consumo de Bolsa Plástica', is_tax: true },
  { id: 11, code: '23', name: 'INCarbono', description: 'Impuesto Nacional al Carbono', is_tax: true },
  { id: 12, code: '24', name: 'INCombustibles', description: 'Impuesto Nacional a los Combustibles', is_tax: true },
  { id: 13, code: '25', name: 'Sobretasa Combustibles', description: 'Sobretasa a los combustibles', is_tax: true },
  { id: 14, code: '26', name: 'Sordicom', description: 'Contribución minoristas (Combustibles)', is_tax: true },
  { id: 15, code: 'ZZ', name: 'Otros', description: 'Otros tributos, tasas, contribuciones, y similares', is_tax: true },
  { id: 16, code: '30', name: 'IC Porcentual', description: 'Impuesto al Consumo de Datos', is_tax: true },
  { id: 17, code: '08', name: 'IC Datos', description: 'Impuesto al Consumo Departamental Porcentual', is_tax: true },
  { id: 18, code: 'ZA', name: 'IVA e INC', description: 'IVA e INC', is_tax: true },
  { id: 19, code: '32', name: 'ICL', description: 'Impuesto al Consumo de Licores', is_tax: true },
  { id: 20, code: '33', name: 'INPP', description: 'Impuesto nacional productos plásticos', is_tax: true },
  { id: 21, code: '34', name: 'IBUA', description: 'Impuesto a las bebidas ultraprocesadas azucaradas', is_tax: true },
  { id: 22, code: '35', name: 'ICUI', description: 'Impuesto a los productos comestibles ultraprocesados', is_tax: true },
  { id: 23, code: '36', name: 'ADV', description: 'AD VALOREM', is_tax: true },
];

export async function seedTaxes(prisma: PrismaClient) {
  console.log('💰 Seeding Tax Types...');
  for (const taxType of taxTypes) {
    await prisma.taxType.upsert({
      where: { id: taxType.id },
      update: { code: taxType.code, name: taxType.name, description: taxType.description, is_tax: taxType.is_tax },
      create: { id: taxType.id, code: taxType.code, name: taxType.name, description: taxType.description, is_tax: taxType.is_tax },
    });
  }
  console.log(`   ✅ ${taxTypes.length} tipos de impuesto creados\n`);
}
