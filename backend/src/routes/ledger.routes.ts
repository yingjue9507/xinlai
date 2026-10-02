import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// 应用认证中间件
router.use(authMiddleware);

// 获取首页统计数据
router.get('/home-stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 使用Prisma查询用户的礼簿
    const userLedgers = await prisma.ledger.findMany({
      where: { userId },
      include: {
        records: true
      }
    });

    // 计算统计数据（按记录方向recordType）
    let totalReceived = 0;
    let totalGiven = 0;

    userLedgers.forEach(ledger => {
      ledger.records.forEach(record => {
        if (!record.isGiftItem) { // 只统计现金
          if (record.recordType === 'received') {
            totalReceived += Number(record.amount);
          } else if (record.recordType === 'sent') {
            totalGiven += Number(record.amount);
          }
        }
      });
    });

    const balance = totalReceived - totalGiven;

    // 格式化礼簿列表供首页展示
    const ledgersForHome = userLedgers.map(ledger => {
      const totalAmount = ledger.records.reduce((sum, record) => sum + record.amount, 0);

      return {
        id: ledger.id,
        name: ledger.ledgerName,
        type: ledger.ledgerType,
        occasion: ledger.occasion,
        totalAmount,
        recordCount: ledger.records.length,
        creationDate: ledger.creationDate
      };
    });

    res.json({
      success: true,
      data: {
        totalReceived,
        totalGiven,
        balance,
        ledgers: ledgersForHome
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取礼簿列表
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 使用Prisma从数据库获取礼簿
    const userLedgers = await prisma.ledger.findMany({
      where: { userId },
      include: {
        records: true
      },
      orderBy: { creationDate: 'desc' }
    });

    const ledgersWithStats = userLedgers.map((ledger) => {
      const totalAmount = ledger.records.reduce((sum, record) => sum + Number(record.amount), 0);
      const averageAmount = ledger.records.length > 0 ? totalAmount / ledger.records.length : 0;

      return {
        id: ledger.id,
        name: ledger.ledgerName,
        type: ledger.ledgerType,
        occasion: ledger.occasion,
        creationDate: ledger.creationDate,
        totalRecords: ledger.records.length,
        totalAmount,
        averageAmount: Math.round(averageAmount)
      };
    });

    res.json({
      success: true,
      data: ledgersWithStats
    });
  } catch (error) {
    next(error);
  }
});

// 创建礼簿
router.post(
  '/',
  [
    body('ledgerName')
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('礼簿名称长度必须在2-20个字符之间'),
    body('ledgerType')
      .isIn(['我办事', '参加别人的事'])
      .withMessage('礼簿类型必须是"我办事"或"参加别人的事"'),
    body('occasion')
      .isIn(['婚嫁', '满月', '乔迁', '生日', '白事', '其他'])
      .withMessage('事由类型不正确')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('\n========== 创建礼簿请求 ==========');
    console.log('📥 请求体:', JSON.stringify(req.body, null, 2));
    console.log('👤 用户ID:', req.userId);
    console.log('🔑 Token存在:', !!req.headers.authorization);
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ 验证失败:', errors.array());
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.userId!;
      const { ledgerName, ledgerType, occasion } = req.body;

      // 使用Prisma创建礼簿
      const newLedger = await prisma.ledger.create({
        data: {
          userId,
          ledgerName,
          ledgerType,
          occasion,
          creationDate: new Date()
        }
      });
      
      console.log('✅ 礼簿创建成功:', newLedger.id);
      console.log('📦 礼簿数据:', JSON.stringify(newLedger, null, 2));
      console.log('📊 礼簿已保存到数据库');
      console.log('==================================\n');

      res.json({
        success: true,
        message: '礼簿创建成功',
        data: newLedger
      });
    } catch (error) {
      console.log('❌ 创建礼簿失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 获取礼簿详情
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('\n========== 获取礼簿详情请求 ==========');
  console.log('🎯 礼簿ID:', req.params.id);
  console.log('👤 用户ID:', req.userId);
  
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 使用Prisma从数据库获取礼簿详情
    const ledger = await prisma.ledger.findFirst({
      where: { 
        id: id,
        userId: userId 
      },
      include: {
        records: {
          orderBy: { recordDate: 'desc' }
        }
      }
    });
    
    console.log('🔍 查找结果:', ledger ? '找到礼簿' : '未找到礼簿');

    if (!ledger) {
      console.log('❌ 礼簿不存在');
      console.log('==================================\n');
      throw new AppError('礼簿不存在', 404);
    }

    const totalAmount = ledger.records.reduce((sum, record) => sum + Number(record.amount), 0);
    const averageAmount = ledger.records.length > 0 ? totalAmount / ledger.records.length : 0;
    
    console.log('✅ 礼簿信息:', { name: ledger.ledgerName, type: ledger.ledgerType });
    console.log('📊 记录数:', ledger.records.length);
    console.log('==================================\n');

    res.json({
      success: true,
      data: {
        ...ledger,
        totalRecords: ledger.records.length,
        totalAmount,
        averageAmount: Math.round(averageAmount)
      }
    });
  } catch (error) {
    console.log('❌ 获取礼簿详情失败:', error);
    console.log('==================================\n');
    next(error);
  }
});

// 更新礼簿
router.put(
  '/:id',
  [
    body('ledgerName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('礼簿名称长度必须在2-20个字符之间'),
    body('ledgerType')
      .optional()
      .isIn(['我办事', '参加别人的事'])
      .withMessage('礼簿类型必须是"我办事"或"参加别人的事"'),
    body('occasion')
      .optional()
      .isIn(['婚嫁', '满月', '乔迁', '生日', '白事', '其他'])
      .withMessage('事由类型不正确')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.userId!;
      const { id } = req.params;
      const { ledgerName, ledgerType, occasion } = req.body;

      // 使用Prisma更新礼簿
      const existingLedger = await prisma.ledger.findFirst({
        where: { 
          id: id,
          userId: userId 
        }
      });

      if (!existingLedger) {
        throw new AppError('礼簿不存在或无权限', 404);
      }

      // 更新礼簿信息
      const updateData: any = {};
      if (ledgerName) updateData.ledgerName = ledgerName;
      if (ledgerType) updateData.ledgerType = ledgerType;
      if (occasion) updateData.occasion = occasion;

      const updatedLedger = await prisma.ledger.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        message: '礼簿更新成功',
        data: updatedLedger
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除礼簿
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 使用Prisma删除礼簿
    const existingLedger = await prisma.ledger.findFirst({
      where: { 
        id: id,
        userId: userId 
      }
    });

    if (!existingLedger) {
      throw new AppError('礼簿不存在或无权限', 404);
    }

    // 删除礼簿及其所有记录（级联删除）
    await prisma.ledger.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: '礼簿删除成功',
      data: {
        deletedLedgerId: id
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
