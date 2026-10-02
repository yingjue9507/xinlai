import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        message: '未提供认证令牌' 
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'default-secret';
    
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: '认证令牌无效或已过期' 
    });
  }
};
