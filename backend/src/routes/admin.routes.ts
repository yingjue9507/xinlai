import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const router = Router();
const prisma = new PrismaClient();

// 管理员认证中间件
interface AdminAuthRequest extends Request {
  adminId?: string;
}

const adminAuthMiddleware = async (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('未提供认证令牌', 401);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret';
    
    try {
      const decoded = jwt.verify(token, secret) as { id: string; role: string };
      if (decoded.role !== 'admin') {
        throw new AppError('无管理员权限', 403);
      }
      req.adminId = decoded.id;
      next();
    } catch (err) {
      throw new AppError('认证令牌无效或已过期', 401);
    }
  } catch (error) {
    next(error);
  }
};

// 管理员登录
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { username, password } = req.body;

      // 查找管理员
      const admin = await prisma.adminUser.findUnique({ where: { username } });
      if (!admin) {
        throw new AppError('管理员不存在', 401);
      }

      // 验证密码
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        throw new AppError('密码错误', 401);
      }

      // 生成Token
      const secret = process.env.JWT_SECRET || 'default-secret';
      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin' },
        secret,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          admin: {
            id: admin.id,
            username: admin.username
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- 以下接口需要管理员权限 ---
router.use(adminAuthMiddleware);

// 获取仪表盘统计数据
router.get('/dashboard-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [userCount, ledgerCount, recordCount, activeAnnouncements] = await Promise.all([
      prisma.user.count(),
      prisma.ledger.count(),
      prisma.record.count(),
      prisma.announcement.count({ where: { isActive: true } })
    ]);

    res.json({
      success: true,
      data: {
        userCount,
        ledgerCount,
        recordCount,
        activeAnnouncements
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取用户列表
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { registrationDate: 'desc' },
      select: {
        id: true,
        phoneNumber: true,
        registrationDate: true,
        lastLoginDate: true,
        _count: {
          select: { ledgers: true }
        }
      }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// === 公告管理 (社区公告) ===

// 获取所有公告
router.get('/announcements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { phoneNumber: true }
        }
      }
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
});

// 创建公告
router.post('/announcements', 
  [
    body('title').notEmpty().withMessage('标题不能为空'),
    body('content').notEmpty().withMessage('内容不能为空'),
    body('eventType').notEmpty().withMessage('事件类型不能为空'),
    body('eventDate').notEmpty().withMessage('事件时间不能为空'),
  ],
  async (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);

    const { title, content, eventType, eventDate, location, contactInfo, isActive } = req.body;

    // 寻找一个系统用户作为发布者 (优先查找 admin 用户，否则使用第一个用户)
    let systemUser = await prisma.user.findFirst({
      where: { phoneNumber: 'admin' } 
    });
    
    if (!systemUser) {
      systemUser = await prisma.user.findFirst();
    }

    if (!systemUser) {
      throw new AppError('系统中没有可用用户来发布公告，请先注册一个用户', 400);
    }

    const announcement = await prisma.announcement.create({
      data: {
        userId: systemUser.id,
        title,
        content,
        eventType,
        eventDate: new Date(eventDate),
        location,
        contactInfo,
        isActive: isActive ?? true,
      }
    });

    res.json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
});

// 更新公告
router.put('/announcements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, content, eventType, eventDate, location, contactInfo, isActive } = req.body;

    const updateData: any = {
      title, 
      content, 
      eventType, 
      location, 
      contactInfo, 
      isActive
    };

    if (eventDate) {
      updateData.eventDate = new Date(eventDate);
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData
    });
    res.json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
});

// 删除公告
router.delete('/announcements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

export default router;
