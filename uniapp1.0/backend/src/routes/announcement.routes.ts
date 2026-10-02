import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// 获取公告不需要认证，所有用户都可以查看

// 获取活跃的公告列表（用于首页滚动显示和公告列表页面）
router.get(
  '/active',
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10; // 默认获取10条

      console.log('\n========== 获取活跃公告 ==========');
      console.log('📊 限制数量:', limit);

      // 获取活跃的公告，按创建时间倒序
      const announcements = await prisma.announcement.findMany({
        where: {
          isActive: true,
          eventDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30天内的事件
          }
        },
        include: {
          user: {
            select: {
              phoneNumber: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }, // 按发布时间倒序（最新的在前）
          { eventDate: 'asc' }   // 相同发布时间按事件时间正序
        ],
        take: limit
      });

      console.log('✅ 找到公告数量:', announcements.length);

      // 格式化返回数据，隐藏敏感信息
      const formattedAnnouncements = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        eventType: announcement.eventType,
        eventDate: announcement.eventDate,
        location: announcement.location,
        contactInfo: announcement.contactInfo,
        createdAt: announcement.createdAt,
        // 隐藏手机号中间4位
        publisherPhone: announcement.user.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      }));

      console.log('==================================\n');

      res.json({
        success: true,
        message: '获取公告成功',
        data: formattedAnnouncements
      });
    } catch (error) {
      console.log('❌ 获取公告失败:', error);
      console.log('==================================\n');
      next(error);
    }
  }
);

// 发布公告接口已移除 - 现在只允许开发者后台管理发布公告
// 用户只有查看权限，无发布权限

export default router;
