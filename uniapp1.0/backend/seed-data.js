const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化测试数据...');

  // 创建测试用户
  const testUser = await prisma.user.upsert({
    where: { phoneNumber: '13800138000' },
    update: {},
    create: {
      phoneNumber: '13800138000',
      registrationDate: new Date(),
      lastLoginDate: new Date()
    }
  });

  console.log('创建/更新测试用户:', testUser.id);

  // 创建测试礼簿
  const testLedger1 = await prisma.ledger.create({
    data: {
      userId: testUser.id,
      ledgerName: '我的婚礼',
      ledgerType: '我办事',
      occasion: '婚嫁',
      creationDate: new Date('2024-01-01')
    }
  });

  const testLedger2 = await prisma.ledger.create({
    data: {
      userId: testUser.id,
      ledgerName: '张三的生日',
      ledgerType: '参加别人的事',
      occasion: '生日',
      creationDate: new Date('2024-01-15')
    }
  });

  console.log('创建测试礼簿:', testLedger1.id, testLedger2.id);

  // 创建一些测试记录
  await prisma.record.createMany({
    data: [
      {
        ledgerId: testLedger1.id,
        contactName: '李四',
        amount: 500,
        isGiftItem: false,
        note: '朋友',
        recordDate: new Date('2024-01-01')
      },
      {
        ledgerId: testLedger1.id,
        contactName: '王五',
        amount: 1000,
        isGiftItem: false,
        note: '同事',
        recordDate: new Date('2024-01-01')
      },
      {
        ledgerId: testLedger2.id,
        contactName: '张三',
        amount: 300,
        isGiftItem: false,
        note: '生日礼物',
        recordDate: new Date('2024-01-15')
      }
    ]
  });

  console.log('创建测试记录完成');

  // 创建通知模板
  await prisma.notificationTemplate.createMany({
    data: [
      {
        templateName: '婚宴邀请',
        templateContent: '亲爱的{联系人},我将于{日期}在{地点}举办婚礼,诚挚邀请您出席见证!',
        templateType: '婚嫁'
      },
      {
        templateName: '满月酒邀请',
        templateContent: '{联系人}您好,小儿满月之喜,特设薄宴于{日期}{地点},恭候光临!',
        templateType: '满月'
      },
      {
        templateName: '乔迁之喜',
        templateContent: '{联系人},搬新家啦!{日期}在{地点}举办乔迁宴,期待您的到来!',
        templateType: '乔迁'
      }
    ]
  });

  console.log('创建通知模板完成');
  console.log('测试数据初始化完成!');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });