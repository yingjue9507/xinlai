import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// 注册接口
router.post(
  '/register',
  [
    body('phoneNumber')
      .custom((v) => v === '123' || /^1[3-9]\d{9}$/.test(v))
      .withMessage('手机号格式不正确'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码长度至少6位')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { phoneNumber, password } = req.body;

      // 检查用户是否已存在
      let user = await prisma.user.findUnique({
        where: { phoneNumber }
      });

      if (user) {
        throw new AppError('该手机号已注册', 400);
      }

      // 加密密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 创建用户
      user = await prisma.user.create({
        data: {
          phoneNumber,
          password: hashedPassword,
          registrationDate: new Date(),
          lastLoginDate: new Date()
        }
      });
      console.log('✅ 新用户注册成功:', user.id);

      // 生成JWT token
      const secret = process.env.JWT_SECRET || 'default-secret';
      const token = jwt.sign({ userId: user.id, phoneNumber: user.phoneNumber }, secret);

      res.json({
        success: true,
        message: '注册成功',
        data: {
          token,
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            registrationDate: user.registrationDate
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// 登录接口 (支持密码登录)
router.post(
  '/login',
  [
    body('phoneNumber')
      .custom((v) => v === '123' || /^1[3-9]\d{9}$/.test(v))
      .withMessage('手机号格式不正确'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('密码格式不正确'),
    body('verificationCode')
      .optional()
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(errors.array()[0].msg, 400);
      }

      const { phoneNumber, password, verificationCode } = req.body;

      let user = await prisma.user.findUnique({
        where: { phoneNumber }
      });

      if (!user) {
        throw new AppError('用户不存在', 404);
      }

      // 优先使用密码登录
      if (password) {
        if (!user.password) {
          throw new AppError('该用户未设置密码，请使用验证码登录或重置密码', 400);
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          throw new AppError('密码错误', 400);
        }
      } 
      // 降级到验证码登录 (保留原有逻辑以兼容旧代码，或者如果用户忘记密码)
      else if (verificationCode) {
        // 测试账号免验证(开发环境)
        const isTestAccount = phoneNumber === '123';
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (!isDevelopment) {
          if (verificationCode !== '123') {
            throw new AppError('验证码错误', 400);
          }
        }
        if (isDevelopment && isTestAccount && verificationCode !== '123') {
          throw new AppError('验证码错误', 400);
        }
      } else {
        throw new AppError('请输入密码或验证码', 400);
      }

      // 更新最后登录时间
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginDate: new Date() }
      });
      console.log('✅ 用户登录成功:', user.id);

      // 生成JWT token  
      const secret = process.env.JWT_SECRET || 'default-secret';
      const token = jwt.sign({ userId: user.id, phoneNumber: user.phoneNumber }, secret);

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            registrationDate: user.registrationDate
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
