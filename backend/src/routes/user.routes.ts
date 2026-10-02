import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { mockUsers, MockUser } from '../mock-data';

const router = Router();

router.use(authMiddleware);

// 获取用户信息
router.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 模拟数据模式 - 从userId中提取手机号
    const phoneNumber = userId.replace('mock-user-', '');
    
    const user = {
      id: userId,
      phoneNumber: phoneNumber,
      registrationDate: new Date(),
      lastLoginDate: new Date()
    };

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// 更新用户信息
router.put('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { nickname, avatar } = req.body;

    // 模拟数据模式 - 暂时只返回成功
    res.json({
      success: true,
      message: '用户信息更新成功',
      data: {
        id: userId,
        nickname,
        avatar
      }
    });
  } catch (error) {
    next(error);
  }
});

// 验证原手机号
router.post(
  '/verify-phone',
  [
    body('verificationCode')
      .matches(/^\d{6}$/)
      .withMessage('验证码格式不正确')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.userId!;
      const { verificationCode } = req.body;

      // 开发环境下简化验证
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!isDevelopment && verificationCode !== '123456') {
        throw new AppError('验证码错误', 400);
      }

      // 生成临时token用于换绑流程
      const secret = process.env.JWT_SECRET || 'default-secret';
      const tempToken = jwt.sign(
        { userId, action: 'change-phone', timestamp: Date.now() },
        secret,
        { expiresIn: '10m' }
      );

      res.json({
        success: true,
        message: '验证成功',
        data: { tempToken }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 换绑新手机号
router.post(
  '/change-phone',
  [
    body('newPhoneNumber')
      .matches(/^1[3-9]\d{9}$/)
      .withMessage('手机号格式不正确'),
    body('verificationCode')
      .matches(/^\d{6}$/)
      .withMessage('验证码格式不正确'),
    body('tempToken')
      .notEmpty()
      .withMessage('临时令牌不能为空')
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const userId = req.userId!;
      const { newPhoneNumber, verificationCode, tempToken } = req.body;

      // 验证临时token
      const secret = process.env.JWT_SECRET || 'default-secret';
      try {
        const decoded = jwt.verify(tempToken, secret) as any;
        
        if (decoded.userId !== userId || decoded.action !== 'change-phone') {
          throw new AppError('临时令牌无效', 400);
        }

        // 检查token是否在10分钟内
        if (Date.now() - decoded.timestamp > 10 * 60 * 1000) {
          throw new AppError('临时令牌已过期', 400);
        }
      } catch (err) {
        throw new AppError('临时令牌验证失败', 400);
      }

      // 验证新手机号的验证码
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!isDevelopment && verificationCode !== '123456') {
        throw new AppError('验证码错误', 400);
      }

      // 检查新手机号是否已被使用
      const newUserId = 'mock-user-' + newPhoneNumber;
      const existingUser = mockUsers.find(u => u.id === newUserId);
      
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('该手机号已被其他账户使用', 400);
      }

      // 模拟数据模式 - 创建新用户ID
      const newUser = {
        id: newUserId,
        phoneNumber: newPhoneNumber,
        registrationDate: new Date(),
        lastLoginDate: new Date()
      };

      // 生成新的JWT token
      const newToken = jwt.sign(
        { userId: newUserId, phoneNumber: newPhoneNumber },
        secret
      );

      res.json({
        success: true,
        message: '手机号换绑成功',
        data: {
          token: newToken,
          user: newUser
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
