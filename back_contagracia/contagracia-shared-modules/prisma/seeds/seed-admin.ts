import { PrismaClient } from '@prisma/client-master';
import * as bcrypt from 'bcryptjs';

const SUPER_ADMIN = {
  email: 'admin@contagracia.com',
  password: 'Admin123!@#',
  full_name: 'Super Administrador',
  phone: '+57 300 000 0000',
  is_active: true,
  email_verified: true,
};

export async function seedAdmin(prisma: PrismaClient) {
  console.log('👤 Seeding Super Admin User...');
  const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: SUPER_ADMIN.email },
    update: {
      full_name: SUPER_ADMIN.full_name,
      phone: SUPER_ADMIN.phone,
      is_active: SUPER_ADMIN.is_active,
      email_verified: SUPER_ADMIN.email_verified,
    },
    create: {
      email: SUPER_ADMIN.email,
      password_hash: passwordHash,
      full_name: SUPER_ADMIN.full_name,
      phone: SUPER_ADMIN.phone,
      is_active: SUPER_ADMIN.is_active,
      email_verified: SUPER_ADMIN.email_verified,
    },
  });
  console.log(`   ✅ Super Admin: ${adminUser.email}\n`);
  console.log('⚠️  IMPORTANTE: Cambiar la contraseña del Super Admin en producción');
  console.log(`   Email: ${SUPER_ADMIN.email}`);
  console.log(`   Password: ${SUPER_ADMIN.password}\n`);
}
