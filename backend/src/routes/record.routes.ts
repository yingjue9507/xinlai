import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware);

// 异步同步联系人数据的辅助函数
async function syncContactDataAsync(userId: string, contactName: string, ledgerId: string) {
  try {
    console.log('\n========== 异步同步联系人数据 ==========');
    console.log('👤 用户ID:', userId);
    console.log('👥 联系人:', contactName);

    // 获取该联系人的所有记录
    const records = await prisma.record.findMany({
      where: {
        contactName: contactName,
        ledger: {
          userId: userId
        }
      }
    });

    console.log('📊 找到该联系人记录数量:', records.length);

    // 计算统计数据
    let totalReceived = 0;
    let totalGiven = 0;
    let lastContactDate = new Date(0);

    records.forEach(record => {
      // 更新最后联系日期
      if (record.recordDate > lastContactDate) {
        lastContactDate = record.recordDate;
      }

      // 只统计现金，不统计物品
      if (!record.isGiftItem) {
        if (record.recordType === 'received') {
          totalReceived += record.amount;
        } else if (record.recordType === 'sent') {
          totalGiven += record.amount;
        }
      }
    });

    // 更新或创建联系人记录
    await prisma.contact.upsert({
      where: {
        userId_contactName: {
          userId: userId,
          contactName: contactName
        }
      },
      update: {
        totalReceived: totalReceived,
        totalGiven: totalGiven,
        lastContactDate: lastContactDate,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        contactName: contactName,
        totalReceived: totalReceived,
        totalGiven: totalGiven,
        lastContactDate: lastContactDate
      }
    });

    console.log('✅ 联系人数据同步完成:', { totalReceived, totalGiven });
    console.log('==================================\n');
  } catch (error) {
    console.log('❌ 异步同步联系人数据失败:', error);
    console.log('==================================\n');
  }
}

// 添加单条记录
router.post(
  '/',
  [
    body('ledgerId').notEmpty().withMessage('礼簿ID不能为空'),
    body('contactName').trim().notEmpty().withMessage('联系人姓名不能为空'),
    body('recordDate').isISO8601().withMessage('日期格式不正确')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.userId!;
      let { 
        ledgerId, 
        contactName, 
        amount, 
        isGiftItem, 
        giftDescription, 
        note, 
        recordDate,
        recordType
      } = req.body;

      console.log('\n========== 添加记录请求 ==========');
      console.log('👤 用户ID:', userId);
      console.log('📚 礼簿ID:', ledgerId);
      console.log('👥 联系人:', contactName);
      console.log('💰 金额:', amount);

      // 验证礼簿是否存在且属于当前用户
      const ledger = await prisma.ledger.findFirst({
        where: { 
          id: ledgerId,
          userId: userId 
        }
      });

      if (!ledger) {
        console.log('❌ 礼簿不存在或无权限');
        throw new AppError('礼簿不存在或无权限', 403);
      }

      // 如果提供了记录类型，但与礼簿类型不匹配：按当前礼簿保存，记录方向保留
      if (recordType) {
        const expectedLedgerType = (recordType === 'received') ? '我办事' : '参加别人的事';
        if (ledger.ledgerType !== expectedLedgerType) {
          console.log('⚠️ 记录类型与礼簿类型不匹配：按当前礼簿保存，记录方向保留');
          console.log('📝 记录类型:', recordType);
          console.log('📚 当前礼簿类型:', ledger.ledgerType);
          // 不再切换礼簿，也不创建新礼簿；遵循用户当前页面上下文
        }
      }

      // 规范化记录类型（支持旧前端传值）
      const normalizedRecordType: string = (recordType === 'sent' || recordType === 'given')
        ? 'sent'
        : 'received';

      // 创建记录
      const newRecord = await prisma.record.create({
        data: {
          ledgerId,
          contactName,
          amount: Number(amount) || 0,
          isGiftItem: isGiftItem || false,
          giftDescription,
          note,
          recordDate: new Date(recordDate),
          recordType: normalizedRecordType,
          creationDate: new Date()
        }
      });

      console.log('✅ 记录创建成功:', newRecord.id);
      
      // 异步同步联系人数据，不阻塞响应
      syncContactDataAsync(userId, contactName, ledgerId);
      
      console.log('==================================\n');

      res.json({
        success: true,
        message: '记录添加成功',
        data: newRecord
      });
    } catch (error) {
      console.log('❌ 添加记录失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 获取人情总览统计数据
router.get(
  '/stats',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      console.log('\n========== 获取人情总览统计 ==========');
      console.log('👤 用户ID:', userId);

      // 计算本月起止时间
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log('📅 本月时间范围:', startOfMonth.toISOString(), '~', endOfMonth.toISOString());

      // 统计收礼总额
      const receivedAgg = await prisma.record.aggregate({
        _sum: {
          amount: true
        },
        where: {
          recordType: 'received',
          isGiftItem: false, // 只统计现金
          ledger: {
            userId: userId
          }
        }
      });

      // 统计送礼总额
      const sentAgg = await prisma.record.aggregate({
        _sum: {
          amount: true
        },
        where: {
          recordType: 'sent',
          isGiftItem: false, // 只统计现金
          ledger: {
            userId: userId
          }
        }
      });

      // 统计本月收礼
      const currentMonthReceivedAgg = await prisma.record.aggregate({
        _sum: {
          amount: true
        },
        where: {
          recordType: 'received',
          isGiftItem: false, // 只统计现金
          ledger: {
            userId: userId
          },
          recordDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      // 统计本月送礼
      const currentMonthGivenAgg = await prisma.record.aggregate({
        _sum: {
          amount: true
        },
        where: {
          recordType: 'sent',
          isGiftItem: false, // 只统计现金
          ledger: {
            userId: userId
          },
          recordDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      const totalReceived = receivedAgg._sum.amount || 0;
      const totalGiven = sentAgg._sum.amount || 0;
      const balance = totalReceived - totalGiven;
      
      const currentMonthReceived = currentMonthReceivedAgg._sum.amount || 0;
      const currentMonthGiven = currentMonthGivenAgg._sum.amount || 0;

      console.log('💰 累计收礼:', totalReceived);
      console.log('💸 累计送礼:', totalGiven);
      console.log('⚖️ 结余:', balance);
      console.log('📅 本月收礼:', currentMonthReceived);
      console.log('📅 本月送礼:', currentMonthGiven);
      console.log('==================================\n');

      res.json({
        success: true,
        message: '获取统计数据成功',
        data: {
          totalReceived,
          totalGiven,
          balance,
          currentMonthReceived,
          currentMonthGiven
        }
      });
    } catch (error) {
      console.log('❌ 获取统计数据失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 获取最近的记录（用于首页近期动态）
router.get(
  '/recent',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 5; // 默认获取5条最新记录

      console.log('\n========== 获取最近记录 ==========');
      console.log('👤 用户ID:', userId);
      console.log('📊 限制数量:', limit);

      // 获取用户的最新记录，包含礼簿信息
      const recentRecords = await prisma.record.findMany({
        where: {
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
          creationDate: 'desc'
        },
        take: limit
      });

      console.log('✅ 找到记录数量:', recentRecords.length);

      // 格式化返回数据
      const formattedRecords = recentRecords.map(record => ({
        id: record.id,
        contactName: record.contactName,
        amount: record.amount,
        recordType: record.recordType,
        isGiftItem: record.isGiftItem,
        giftDescription: record.giftDescription,
        note: record.note,
        recordDate: record.recordDate,
        creationDate: record.creationDate,
        ledgerId: record.ledgerId,
        ledger: {
          id: record.ledger.id,
          name: record.ledger.ledgerName,
          occasion: record.ledger.occasion,
          type: record.ledger.ledgerType
        }
      }));

      console.log('==================================\n');

      res.json({
        success: true,
        message: '获取最近记录成功',
        data: formattedRecords
      });
    } catch (error) {
      console.log('❌ 获取最近记录失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 更新记录
router.put(
  '/:id',
  [
    body('contactName').trim().notEmpty().withMessage('联系人姓名不能为空'),
    body('recordDate').isISO8601().withMessage('日期格式不正确')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.userId!;
      const recordId = req.params.id;
      const { 
        contactName, 
        amount, 
        isGiftItem, 
        giftDescription, 
        note, 
        recordDate 
      } = req.body;

      console.log('\n========== 更新记录请求 ==========');
      console.log('👤 用户ID:', userId);
      console.log('📝 记录ID:', recordId);
      console.log('👥 联系人:', contactName);
      console.log('💰 金额:', amount);

      // 验证记录是否存在且属于当前用户
      const existingRecord = await prisma.record.findFirst({
        where: { 
          id: recordId,
          ledger: {
            userId: userId
          }
        }
      });

      if (!existingRecord) {
        console.log('❌ 记录不存在或无权限');
        throw new AppError('记录不存在或无权限', 403);
      }

      // 更新记录
      const updatedRecord = await prisma.record.update({
        where: { id: recordId },
        data: {
          contactName,
          amount: Number(amount) || 0,
          isGiftItem: isGiftItem || false,
          giftDescription,
          note,
          recordDate: new Date(recordDate),
          lastUpdateDate: new Date()
        }
      });

      console.log('✅ 记录更新成功:', updatedRecord.id);
      
      // 异步同步联系人数据，不阻塞响应
      syncContactDataAsync(userId, contactName, existingRecord.ledgerId);
      
      console.log('==================================\n');

      res.json({
        success: true,
        message: '记录更新成功',
        data: updatedRecord
      });
    } catch (error) {
      console.log('❌ 更新记录失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 删除记录
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const recordId = req.params.id;

      console.log('\n========== 删除记录请求 ==========');
      console.log('👤 用户ID:', userId);
      console.log('📝 记录ID:', recordId);

      // 验证记录是否存在且属于当前用户
      const existingRecord = await prisma.record.findFirst({
        where: { 
          id: recordId,
          ledger: {
            userId: userId
          }
        }
      });

      if (!existingRecord) {
        console.log('❌ 记录不存在或无权限');
        throw new AppError('记录不存在或无权限', 403);
      }

      // 保存联系人信息用于同步
      const contactName = existingRecord.contactName;
      const ledgerId = existingRecord.ledgerId;

      // 删除记录
      await prisma.record.delete({
        where: { id: recordId }
      });

      console.log('✅ 记录删除成功');
      
      // 异步同步联系人数据，不阻塞响应
      syncContactDataAsync(userId, contactName, ledgerId);
      
      console.log('==================================\n');

      res.json({
        success: true,
        message: '记录删除成功'
      });
    } catch (error) {
      console.log('❌ 删除记录失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 获取与特定联系人的往来记录
router.get(
  '/contact/:contactName',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const contactName = decodeURIComponent(req.params.contactName);

      console.log('\n========== 获取联系人往来记录 ==========');
      console.log('👤 用户ID:', userId);
      console.log('👥 联系人姓名:', contactName);

      // 获取该联系人的所有记录
      const records = await prisma.record.findMany({
        where: {
          ledger: {
            userId: userId
          },
          contactName: contactName
        },
        include: {
          ledger: {
            select: {
              id: true,
              ledgerName: true,
              ledgerType: true,
              occasion: true
            }
          }
        },
        orderBy: {
          recordDate: 'desc'
        }
      });

      console.log('✅ 找到记录数量:', records.length);

      // 格式化返回数据
      const formattedRecords = records.map(record => ({
        id: record.id,
        contactName: record.contactName,
        amount: record.amount,
        recordType: record.recordType,
        isGiftItem: record.isGiftItem,
        giftDescription: record.giftDescription,
        note: record.note,
        recordDate: record.recordDate,
        ledger: record.ledger
      }));

      console.log('==================================\n');

      res.json({
        success: true,
        message: '获取往来记录成功',
        data: formattedRecords
      });
    } catch (error) {
      console.log('❌ 获取往来记录失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 获取用户的统计数据（用于首页人情总览）
router.get(
'/stats',
async (req: AuthRequest, res: Response, next: NextFunction) => {
try {
const userId = req.userId!;

console.log('\n========== 获取用户统计数据 ==========');
console.log('👤 用户ID:', userId);

      // 获取用户所有礼簿的记录
      const allRecords = await prisma.record.findMany({
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

      console.log('📊 找到记录总数:', allRecords.length);

      // 计算统计数据（按记录方向recordType）
      let totalReceived = 0; // 累计收礼
      let totalGiven = 0;    // 累计送礼
      let receivedCount = 0;
      let givenCount = 0;

      allRecords.forEach(record => {
        if (!record.isGiftItem) { // 只统计现金，不统计物品
          if (record.recordType === 'received') {
            totalReceived += record.amount;
            receivedCount++;
          } else if (record.recordType === 'sent') {
            totalGiven += record.amount;
            givenCount++;
          }
        }
      });

      const balance = totalReceived - totalGiven; // 结余

      const stats = {
        totalReceived,
        totalGiven,
        balance,
        receivedCount,
        givenCount,
        totalRecords: allRecords.length
      };

      console.log('✅ 统计结果:', stats);
      console.log('==================================\n');

      res.json({
        success: true,
        message: '获取统计数据成功',
        data: stats
      });
    } catch (error) {
      console.log('❌ 获取统计数据失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

export default router;
