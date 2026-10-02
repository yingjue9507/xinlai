const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestOutgoingRecords() {
  try {
    console.log('========== 添加送出记录测试数据 ==========');
    
    // 获取第一个用户
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ 没有找到用户');
      return;
    }
    
    console.log('👤 用户ID:', user.id);
    
    // 创建一个"参加别人的事"类型的礼簿
    const outgoingLedger = await prisma.ledger.create({
      data: {
        userId: user.id,
        ledgerName: '王三婚礼',
        ledgerType: '参加别人的事',
        occasion: '婚嫁',
        creationDate: new Date()
      }
    });
    
    console.log('✅ 创建送礼礼簿:', outgoingLedger.ledgerName);
    
    // 添加一些送出记录
    const outgoingRecords = [
      {
        ledgerId: outgoingLedger.id,
        contactName: '王三',
        amount: 500,
        isGiftItem: false,
        note: '婚礼随礼',
        recordDate: new Date('2025-11-25')
      },
      {
        ledgerId: outgoingLedger.id,
        contactName: '李四',
        amount: 300,
        isGiftItem: false,
        note: '婚礼随礼',
        recordDate: new Date('2025-11-24')
      }
    ];
    
    for (const recordData of outgoingRecords) {
      const record = await prisma.record.create({
        data: recordData
      });
      console.log(`✅ 添加送出记录: ${record.contactName} - ¥${record.amount}`);
    }
    
    // 创建另一个"参加别人的事"类型的礼簿
    const anotherOutgoingLedger = await prisma.ledger.create({
      data: {
        userId: user.id,
        ledgerName: '张五生日',
        ledgerType: '参加别人的事',
        occasion: '生日',
        creationDate: new Date()
      }
    });
    
    console.log('✅ 创建送礼礼簿:', anotherOutgoingLedger.ledgerName);
    
    // 添加更多送出记录，包括与现有联系人的往来
    const moreOutgoingRecords = [
      {
        ledgerId: anotherOutgoingLedger.id,
        contactName: '王二麻', // 这个联系人已经有收入记录
        amount: 200,
        isGiftItem: false,
        note: '生日礼金',
        recordDate: new Date('2025-11-23')
      },
      {
        ledgerId: anotherOutgoingLedger.id,
        contactName: '张五',
        amount: 400,
        isGiftItem: false,
        note: '生日礼金',
        recordDate: new Date('2025-11-23')
      }
    ];
    
    for (const recordData of moreOutgoingRecords) {
      const record = await prisma.record.create({
        data: recordData
      });
      console.log(`✅ 添加送出记录: ${record.contactName} - ¥${record.amount}`);
    }
    
    console.log('\n🎉 测试数据添加完成！');
    
  } catch (error) {
    console.error('❌ 添加测试数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestOutgoingRecords();
