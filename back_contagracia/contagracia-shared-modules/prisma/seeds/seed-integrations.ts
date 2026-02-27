import { PrismaClient } from '@prisma/client-master';
import { integrations } from './integrations';

export async function seedIntegrations(prisma: PrismaClient) {
  console.log('🔌 Seeding Integrations...');
  for (const integration of integrations) {
    const { keys, ...integrationData } = integration;

    const createdIntegration = await prisma.integration.upsert({
      where: { code: integration.code },
      update: {
        name: integrationData.name,
        type: integrationData.type,
        description: integrationData.description,
        is_active: integrationData.is_active,
      },
      create: {
        code: integrationData.code,
        name: integrationData.name,
        type: integrationData.type,
        description: integrationData.description,
        is_active: integrationData.is_active,
      },
    });

    for (const key of keys) {
      await prisma.integrationKey.upsert({
        where: {
          integration_id_key_name: {
            integration_id: createdIntegration.id,
            key_name: key.key_name,
          },
        },
        update: {
          key_value: key.key_value,
          is_secret: key.is_secret,
        },
        create: {
          integration_id: createdIntegration.id,
          key_name: key.key_name,
          key_value: key.key_value,
          is_secret: key.is_secret,
        },
      });
    }
    console.log(`   ✅ Integración "${integration.name}" con ${keys.length} keys`);
  }
  console.log('');
}
