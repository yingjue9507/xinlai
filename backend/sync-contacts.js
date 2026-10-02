const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncAllContacts() {
  try {
    console.log('========== 同步所有联系人数据 ==========');
    
    // 获取所有用户
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      console.log(`\n👤 同步用户: ${user.id}`);
      
      // 获取用户所有记录中的联系人
      const records = await prisma.record.findMany({
        where: {
          ledger: {
            userId: user.id
          }
        },
        include: {
          ledger: {
            select: {
              ledgerType: true
            }
          }
        }
      });

      console.log('📊 找到记录数量:', records.length);

      // 按联系人姓名分组统计
      const contactStats = {};

      records.forEach(record => {
        if (!contactStats[record.contactName]) {
          contactStats[record.contactName] = {
            totalReceived: 0,
            totalGiven: 0,
            lastContactDate: record.recordDate
          };
        }

        const stats = contactStats[record.contactName];
        
        // 更新最后联系日期
        if (record.recordDate > stats.lastContactDate) {
          stats.lastContactDate = record.recordDate;
        }

        // 只统计现金，不统计物品
        if (!record.isGiftItem) {
          if (record.ledger.ledgerType === '我办事') {
            stats.totalReceived += record.amount;
          } else if (record.ledger.ledgerType === '参加别人的事') {
            stats.totalGiven += record.amount;
          }
        }
      });

      console.log('👥 联系人统计数量:', Object.keys(contactStats).length);

      // 更新或创建联系人记录
      for (const [contactName, stats] of Object.entries(contactStats)) {
        await prisma.contact.upsert({
          where: {
            userId_contactName: {
              userId: user.id,
              contactName: contactName
            }
          },
          update: {
            totalReceived: stats.totalReceived,
            totalGiven: stats.totalGiven,
            lastContactDate: stats.lastContactDate,
            updatedAt: new Date()
          },
          create: {
            userId: user.id,
            contactName: contactName,
            totalReceived: stats.totalReceived,
            totalGiven: stats.totalGiven,
            lastContactDate: stats.lastContactDate
          }
        });
        
        console.log(`✅ 同步联系人: ${contactName} - 收到¥${stats.totalReceived}, 送出¥${stats.totalGiven}`);
      }
    }
    
    console.log('\n🎉 所有联系人数据同步完成！');
    
  } catch (error) {
    console.error('❌ 同步联系人数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncAllContacts();
