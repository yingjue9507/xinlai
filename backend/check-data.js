const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('========== 检查数据库数据 ==========');
    
    // 检查所有礼簿
    const ledgers = await prisma.ledger.findMany({
      include: {
        records: true
      }
    });
    
    console.log('\n📚 礼簿数据:');
    ledgers.forEach(ledger => {
      console.log(`- ${ledger.ledgerName} (${ledger.ledgerType}) - 记录数: ${ledger.records.length}`);
    });
    
    // 检查所有记录
    const records = await prisma.record.findMany({
      include: {
        ledger: {
          select: {
            ledgerName: true,
            ledgerType: true
          }
        }
      },
      orderBy: {
        recordDate: 'desc'
      }
    });
    
    console.log('\n📝 记录数据:');
    records.forEach(record => {
      console.log(`- ${record.contactName}: ¥${record.amount} (${record.ledger.ledgerType}) - ${record.ledger.ledgerName}`);
    });
    
    // 检查联系人数据
    const contacts = await prisma.contact.findMany();
    
    console.log('\n👥 联系人数据:');
    contacts.forEach(contact => {
      console.log(`- ${contact.contactName}: 收到¥${contact.totalReceived}, 送出¥${contact.totalGiven}, 结余¥${contact.totalReceived - contact.totalGiven}`);
    });
    
    // 检查特定联系人的记录
    const wangSanRecords = await prisma.record.findMany({
      where: {
        contactName: '王三'
      },
      include: {
        ledger: {
          select: {
            ledgerName: true,
            ledgerType: true
          }
        }
      }
    });
    
    console.log('\n🔍 王三的记录:');
    wangSanRecords.forEach(record => {
      console.log(`- ¥${record.amount} (${record.ledger.ledgerType}) - ${record.ledger.ledgerName} - ${record.recordDate}`);
    });
    
  } catch (error) {
    console.error('检查数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
