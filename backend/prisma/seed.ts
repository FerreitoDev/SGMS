import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = 'admin';
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);

    const admin = await prisma.user.create({
      data: {
        name: 'Administrador Gerente',
        username: adminUsername,
        passwordHash,
        role: UserRole.GERENTE,
        isActive: true,
      },
    });

    console.log(`[Seed] Usuário Gerente inicial criado: ${admin.username} (${admin.id})`);
  } else {
    console.log(`[Seed] Usuário Gerente '${adminUsername}' já existe.`);
  }
}

main()
  .catch((e) => {
    console.error('[Seed] Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
