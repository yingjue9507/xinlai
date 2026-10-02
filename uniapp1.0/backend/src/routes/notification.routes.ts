import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { mockNotificationTemplates, mockMassSendLogs, mockLedgers, MockMassSendLog } from '../mock-data';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// 获取通知模板列表
router.get('/templates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 模拟数据模式 - 直接返回预设模板
    res.json({
      success: true,
      data: mockNotificationTemplates
    });
  } catch (error) {
    next(error);
  }
});

// 发送通知
router.post(
  '/send',
  [
    body('recipients').isArray({ min: 1 }).withMessage('接收人列表不能为空'),
    body('message').trim().notEmpty().withMessage('消息内容不能为空')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.userId!;
      const { recipients, message, ledgerId } = req.body;

      // 模拟短信发送
      console.log(`📨 群发通知 - 接收人数: ${recipients.length}`);
      console.log(`📝 消息内容: ${message}`);
      recipients.forEach((recipient: any, index: number) => {
        console.log(`  ${index + 1}. ${recipient.name} (${recipient.phoneNumber || '无电话'})`);
      });

      const newLog: MockMassSendLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        userId,
        ledgerId,
        sendTime: new Date(),
        recipientCount: recipients.length,
        messageContentSummary: message.substring(0, 100),
        status: 'success'
      };

      mockMassSendLogs.push(newLog);

      res.json({
        success: true,
        message: `成功发送 ${recipients.length} 条通知(模拟)`,
        data: newLog
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取群发记录
router.get('/logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 模拟数据模式
    const logs = mockMassSendLogs
      .filter(log => log.userId === userId)
      .map(log => {
        const ledger = log.ledgerId ? mockLedgers.find(l => l.id === log.ledgerId) : null;
        return {
          ...log,
          ledger: ledger ? { ledgerName: ledger.ledgerName } : null
        };
      });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

export default router;
