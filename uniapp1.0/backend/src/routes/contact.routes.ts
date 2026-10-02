import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// 同步联系人数据的辅助函数
async function syncContactData(userId: string) {
  console.log('\n========== 同步联系人数据 ==========');
  console.log('👤 用户ID:', userId);

  // 获取用户所有记录中的联系人
  const records = await prisma.record.findMany({
    where: {
      ledger: {
        userId: userId
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
  const contactStats: { [name: string]: { totalReceived: number; totalGiven: number; lastContactDate: Date } } = {};

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
      if (record.recordType === 'received') {
        stats.totalReceived += record.amount;
      } else if (record.recordType === 'sent') {
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
          userId: userId,
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
        userId: userId,
        contactName: contactName,
        totalReceived: stats.totalReceived,
        totalGiven: stats.totalGiven,
        lastContactDate: stats.lastContactDate
      }
    });
  }

  console.log('✅ 联系人数据同步完成');
  console.log('==================================\n');
}

// 获取联系人列表
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { search } = req.query;

    console.log('\n========== 获取联系人列表 ==========');
    console.log('👤 用户ID:', userId);
    console.log('🔍 搜索关键词:', search);

    // 先同步联系人数据 - 移除全量同步，改为依赖写入时的增量同步
    // await syncContactData(userId);

    // 查询联系人数据
    let whereCondition: any = { userId: userId };
    if (search) {
      whereCondition.contactName = {
        contains: search as string
      };
    }

    const contacts = await prisma.contact.findMany({
      where: whereCondition,
      orderBy: {
        contactName: 'asc'
      }
    });

    console.log('👥 找到联系人数量:', contacts.length);

    // 按拼音首字母分组
    const groupedContacts: { [key: string]: any[] } = {};
    
    // 使用for...of循环替代forEach以支持await
    for (const contact of contacts) {
      const firstLetter = contact.contactName.charAt(0).toUpperCase();
      if (!groupedContacts[firstLetter]) {
        groupedContacts[firstLetter] = [];
      }
      
      // 获取该联系人的记录数量
      const contactRecords = await prisma.record.count({
        where: {
          contactName: contact.contactName,
          ledger: {
            userId: userId
          }
        }
      });

      groupedContacts[firstLetter].push({
        id: contact.id,
        name: contact.contactName,
        phoneNumber: contact.phoneNumber,
        totalReceived: contact.totalReceived,
        totalGiven: contact.totalGiven,
        balance: contact.totalReceived - contact.totalGiven,
        lastContactDate: contact.lastContactDate,
        transactionCount: contactRecords // 实际往来记录数量
      });
    }

    const sections = Object.keys(groupedContacts)
      .sort()
      .map(letter => ({
        title: letter,
        data: groupedContacts[letter]
      }));

    console.log('✅ 联系人列表获取成功');
    console.log('==================================\n');

    res.json({
      success: true,
      message: '获取联系人列表成功',
      data: sections
    });
  } catch (error) {
    console.log('❌ 获取联系人列表失败:', error);
    console.log('==================================\n');
    next(error);
  }
});

// 获取联系人详情
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    console.log('\n========== 获取联系人详情 ==========');
    console.log('👤 用户ID:', userId);
    console.log('👥 联系人ID:', id);

    // 先同步联系人数据 - 移除全量同步，改为依赖写入时的增量同步
    // await syncContactData(userId);

    // 查询联系人信息
    const contact = await prisma.contact.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!contact) {
      console.log('❌ 联系人不存在');
      console.log('==================================\n');
      res.status(404).json({
        success: false,
        message: '联系人不存在'
      });
      return;
    }

    console.log('✅ 找到联系人:', contact.contactName);

    // 查询该联系人的所有记录
    const records = await prisma.record.findMany({
      where: {
        contactName: contact.contactName,
        ledger: {
          userId: userId
        }
      },
      include: {
        ledger: {
          select: {
            id: true,
            ledgerName: true,
            occasion: true,
            ledgerType: true
          }
        }
      },
      orderBy: {
        recordDate: 'desc'
      }
    });

    // 计算往来记录数量
    const transactionCount = records.length;

    console.log('📊 找到记录数量:', records.length);

    // 格式化记录数据
    const formattedRecords = records.map(record => ({
      id: record.id,
      ledgerId: record.ledgerId,
      ledgerName: record.ledger.ledgerName,
      occasion: record.ledger.occasion,
      ledgerType: record.ledger.ledgerType,
      amount: record.amount,
      isGiftItem: record.isGiftItem,
      giftDescription: record.giftDescription,
      note: record.note,
      recordDate: record.recordDate
    }));

    console.log('✅ 联系人详情获取成功');
    console.log('==================================\n');

    res.json({
      success: true,
      message: '获取联系人详情成功',
      data: {
        contact: {
          id: contact.id,
          name: contact.contactName,
          phoneNumber: contact.phoneNumber,
          totalReceived: contact.totalReceived,
          totalGiven: contact.totalGiven,
          balance: contact.totalReceived - contact.totalGiven,
          lastContactDate: contact.lastContactDate,
          transactionCount: transactionCount // 添加往来记录数量
        },
        records: formattedRecords
      }
    });
  } catch (error) {
    console.log('❌ 获取联系人详情失败:', error);
    console.log('==================================\n');
    next(error);
  }
});

export default router;
