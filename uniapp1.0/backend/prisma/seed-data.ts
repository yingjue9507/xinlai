import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 辅助函数：生成随机日期（过去1年内）
function randomDate(start = new Date(2023, 0, 1), end = new Date()) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 辅助函数：随机选择
function sample(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const phoneNumber = '13800000000';
  
  console.log('Searching for user...');
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    console.log('User not found. Please run seed-user.ts first.');
    return;
  }
  
  const userId = user.id;
  console.log(`Found user: ${userId}, starting data cleanup...`);

  // 1. 清理该用户的旧数据 (保留用户本身)
  // 注意：删除顺序很重要，先删子表记录，再删主表
  await prisma.record.deleteMany({ where: { ledger: { userId } } });
  await prisma.ledger.deleteMany({ where: { userId } });
  await prisma.contact.deleteMany({ where: { userId } });
  
  console.log('Old data cleared.');

  // 2. 预定义数据池
  const firstNames = ['伟', '芳', '娜', '敏', '静', '秀英', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟'];
  const lastNames = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高'];
  
  // 生成 20 个联系人
  const contacts = [];
  for(let i=0; i<20; i++) {
    const name = sample(lastNames) + sample(firstNames);
    if (!contacts.includes(name)) contacts.push(name);
  }

  // 3. 定义账本场景
  const ledgerScenarios = [
    { name: '我的婚礼', type: 'received', occasion: 'wedding', recordCount: 15 },
    { name: '儿子满月酒', type: 'received', occasion: 'baby_born', recordCount: 10 },
    { name: '父亲80大寿', type: 'received', occasion: 'birthday', recordCount: 8 },
    { name: '2023春节人情往来', type: 'given', occasion: 'other', recordCount: 5 }, // 支出
    { name: '表弟结婚', type: 'given', occasion: 'wedding', recordCount: 1 }, // 支出，单笔
    { name: '同事乔迁之喜', type: 'given', occasion: 'house_moving', recordCount: 3 }, // 支出
    { name: '老家丧事礼金', type: 'received', occasion: 'funeral', recordCount: 12 },
  ];

  console.log('Seeding ledgers and records...');

  for (const scenario of ledgerScenarios) {
    // 创建账本
    const ledger = await prisma.ledger.create({
      data: {
        userId,
        ledgerName: scenario.name,
        ledgerType: scenario.type,
        occasion: scenario.occasion,
        creationDate: randomDate(),
        // description removed as it is not in schema
      }
    });

    // 为每个账本创建记录
    let ledgerTotal = 0;
    
    for (let i = 0; i < scenario.recordCount; i++) {
      const contactName = sample(contacts);
      const isGift = Math.random() > 0.8; // 20% 概率是礼物
      const amount = isGift ? 0 : Math.floor(Math.random() * 10 + 1) * 100; // 100-1000的整数
      const giftDesc = isGift ? '精美礼盒一套' : null;
      
      const recordType = scenario.type === 'received' ? 'received' : 'given'; // 保持一致，或者是互斥逻辑

      // 创建记录
      await prisma.record.create({
        data: {
          ledgerId: ledger.id,
          contactName,
          amount: isGift ? 0 : amount, // 如果是纯礼物，金额可能为0或者估值
          recordType: recordType, 
          recordDate: randomDate(ledger.creationDate), // 记录时间在账本创建之后
          isGiftItem: isGift,
          giftDescription: giftDesc,
          note: Math.random() > 0.7 ? '关系很好' : ''
        }
      });

      // 更新联系人统计 (Upsert)
      const existingContact = await prisma.contact.findUnique({
        where: {
          userId_contactName: { userId, contactName }
        }
      });

      let totalReceived = existingContact?.totalReceived || 0;
      let totalGiven = existingContact?.totalGiven || 0;

      if (recordType === 'received') {
        totalReceived += amount;
      } else {
        totalGiven += amount;
      }

      await prisma.contact.upsert({
        where: { userId_contactName: { userId, contactName } },
        create: {
          userId,
          contactName,
          totalReceived: recordType === 'received' ? amount : 0,
          totalGiven: recordType === 'given' ? amount : 0,
          lastContactDate: new Date()
        },
        update: {
          totalReceived,
          totalGiven,
          lastContactDate: new Date()
        }
      });
      
      ledgerTotal += amount;
    }
    
    // Ledger totals are calculated on-the-fly, so no update needed for Ledger model
    
    console.log(`  > Created ledger "${scenario.name}" with ${scenario.recordCount} records.`);
  }

  console.log('All seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
