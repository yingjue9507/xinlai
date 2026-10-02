const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAddRecord() {
  try {
    console.log('========== 测试添加记录功能 ==========');
    
    // 获取用户
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ 没有找到用户');
      return;
    }
    
    console.log('👤 用户ID:', user.id);
    
    // 获取现有礼簿
    const ledgers = await prisma.ledger.findMany({
      where: { userId: user.id }
    });
    
    console.log('\n📚 现有礼簿:');
    ledgers.forEach(ledger => {
      console.log(`- ${ledger.ledgerName} (${ledger.ledgerType}) - ID: ${ledger.id}`);
    });
    
    // 测试1: 添加收到记录到"我办事"类型礼簿
    const myEventLedger = ledgers.find(l => l.ledgerType === '我办事');
    if (myEventLedger) {
      console.log('\n✅ 测试1: 添加收到记录到现有"我办事"礼簿');
      console.log('目标礼簿:', myEventLedger.ledgerName);
      console.log('应该使用礼簿ID:', myEventLedger.id);
    }
    
    // 测试2: 添加送出记录到"参加别人的事"类型礼簿
    const attendEventLedger = ledgers.find(l => l.ledgerType === '参加别人的事');
    if (attendEventLedger) {
      console.log('\n✅ 测试2: 添加送出记录到现有"参加别人的事"礼簿');
      console.log('目标礼簿:', attendEventLedger.ledgerName);
      console.log('应该使用礼簿ID:', attendEventLedger.id);
    }
    
    // 测试3: 类型不匹配的情况
    console.log('\n✅ 测试3: 类型不匹配时应该创建新礼簿');
    console.log('例如：在"我办事"礼簿中添加"送出"记录');
    
    console.log('\n🎯 测试URL示例:');
    if (myEventLedger) {
      console.log(`收到记录: http://localhost:8081/P-ADD_RECORD.html?ledger_id=${myEventLedger.id}`);
    }
    if (attendEventLedger) {
      console.log(`送出记录: http://localhost:8081/P-ADD_RECORD.html?ledger_id=${attendEventLedger.id}`);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAddRecord();
