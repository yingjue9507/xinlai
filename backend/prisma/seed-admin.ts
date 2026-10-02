import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { username },
  });

  if (!existingAdmin) {
    await prisma.adminUser.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    console.log('Admin user created: admin / 123456');
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
