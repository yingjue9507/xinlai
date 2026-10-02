import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const phoneNumber = '13800000000';
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        phoneNumber,
        password: hashedPassword,
      },
    });
    console.log(`Test user created: ${phoneNumber} / ${password}`);
  } else {
    console.log(`Test user already exists: ${phoneNumber}`);
    // 如果需要重置密码确保可用，可以取消注释下面代码
    // await prisma.user.update({
    //   where: { phoneNumber },
    //   data: { password: hashedPassword }
    // });
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
