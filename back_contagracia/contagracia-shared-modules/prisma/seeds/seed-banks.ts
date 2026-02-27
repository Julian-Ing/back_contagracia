import { PrismaClient } from '@prisma/client-master';

const banks = [
  { code: 'DAVIPLATA', name: 'Daviplata' },
  { code: 'AV_VILLAS', name: 'Banco AV Villas' },
  { code: 'SCOTIABANK', name: 'Scotiabank Colpatria' },
  { code: 'COOPCENTRAL', name: 'Banco Cooperativo Coopcentral' },
  { code: 'PICHINCHA', name: 'Banco Pichincha' },
  { code: 'CITIBANK', name: 'Citibank Colombia' },
  { code: 'ITAU', name: 'Banco Itaú' },
  { code: 'FINANDINA', name: 'Banco Finandina' },
  { code: 'BANCAMIA', name: 'Bancamía' },
  { code: 'CONTACTAR', name: 'Banco Contactar' },
  { code: 'COOMEVA', name: 'Banco Coomeva' },
  { code: 'AGRARIO', name: 'Banco Agrario de Colombia' },
  { code: 'BBVA', name: 'BBVA Colombia' },
  { code: 'UNION', name: 'Banco Unión' },
  { code: 'CAJA_SOCIAL', name: 'Banco Caja Social' },
  { code: 'NEQUI', name: 'Nequi' },
  { code: 'OCCIDENTE', name: 'Banco de Occidente' },
  { code: 'BAN100', name: 'Ban100' },
  { code: 'GNB_SUDAMERIS', name: 'Banco GNB Sudameris' },
  { code: 'BTG_PACTUAL', name: 'BTG Pactual Colombia' },
  { code: 'MIBANCO', name: 'MiBanco' },
  { code: 'BANCOLOMBIA', name: 'Bancolombia' },
  { code: 'BOGOTA', name: 'Banco de Bogotá' },
  { code: 'JP_MORGAN', name: 'Banco J.P. Morgan Colombia' },
  { code: 'BANCO_W', name: 'Banco W' },
  { code: 'NUBANK', name: 'Nu Bank' },
  { code: 'DAVIVIENDA', name: 'Davivienda' },
  { code: 'POPULAR', name: 'Banco Popular' },
  { code: 'FALABELLA', name: 'Banco Falabella' },
  { code: 'SERFINANZA', name: 'Serfinanza' },
  { code: 'LULO_BANK', name: 'Lulo Bank' },
  { code: 'UALÁ', name: 'Ualá' },
];

export async function seedBanks(prisma: PrismaClient) {
  console.log('🏦 Seeding Banks...');
  for (const bank of banks) {
    await prisma.bank.upsert({
      where: { code: bank.code },
      update: { name: bank.name },
      create: { code: bank.code, name: bank.name, country: 'CO' },
    });
  }
  console.log(`   ✅ ${banks.length} bancos creados\n`);
}
