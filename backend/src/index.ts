import express, { Express, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import ledgerRoutes from './routes/ledger.routes';
import recordRoutes from './routes/record.routes';
import contactRoutes from './routes/contact.routes';
import notificationRoutes from './routes/notification.routes';
import exportRoutes from './routes/export.routes';
import userRoutes from './routes/user.routes';
import announcementRoutes from './routes/announcement.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app: Express = express();
const PORT = Number(process.env.PORT) || 3000;

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : (process.env.ALLOWED_ORIGINS?.split(',') || '*'),
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查接口
app.get('/api/health', (_req, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: '心来后端服务'
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/user', userRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);

// 错误处理中间件
app.use(errorHandler);

// 启动服务器 - 监听所有网络接口以支持局域网访问
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 心来后端服务启动成功`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📡 局域网地址: http://192.168.1.22:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
});

export default app;
