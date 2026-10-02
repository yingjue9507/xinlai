const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 检查数据库连接...');
    
    // 检查所有表的数据
    const users = await prisma.user.findMany();
    const ledgers = await prisma.ledger.findMany();
    const records = await prisma.record.findMany();
    
    console.log('👥 用户数量:', users.length);
    console.log('📚 礼簿数量:', ledgers.length);
    console.log('📝 记录数量:', records.length);
    
    if (users.length === 0) {
      console.log('🆕 创建测试用户...');
      const testUser = await prisma.user.create({
        data: {
          phoneNumber: '13800138000',
          registrationDate: new Date(),
          lastLoginDate: new Date()
        }
      });
      console.log('✅ 测试用户创建成功:', testUser.id);
      
      console.log('🆕 创建测试礼簿...');
      const testLedger = await prisma.ledger.create({
        data: {
          userId: testUser.id,
          ledgerName: '测试礼簿',
          ledgerType: '我办事',
          occasion: '婚嫁',
          creationDate: new Date()
        }
      });
      console.log('✅ 测试礼簿创建成功:', testLedger.id);
    }
    
    // 再次检查数据
    const finalUsers = await prisma.user.findMany();
    const finalLedgers = await prisma.ledger.findMany();
    
    console.log('📊 最终统计:');
    console.log('  用户:', finalUsers.length);
    console.log('  礼簿:', finalLedgers.length);
    
    if (finalLedgers.length > 0) {
      console.log('📋 礼簿列表:');
      finalLedgers.forEach(ledger => {
        console.log(`  - ${ledger.ledgerName} (${ledger.ledgerType}, ${ledger.occasion})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
