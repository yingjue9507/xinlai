import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl, body, query, params } = req;

  // 响应结束时记录日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // 构造日志信息
    const logInfo = {
      timestamp: new Date().toISOString(),
      method,
      url: originalUrl,
      status,
      duration: `${duration}ms`,
      query: Object.keys(query).length ? query : undefined,
      // body: Object.keys(body).length ? body : undefined, // 避免日志过大，视情况开启
      params: Object.keys(params).length ? params : undefined,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    // 根据状态码使用不同的日志级别
    if (status >= 400) {
      console.error('❌ [Request Error]', JSON.stringify(logInfo, null, 2));
    } else {
      console.log('✅ [Request Success]', `${method} ${originalUrl} ${status} ${duration}ms`);
    }
  });

  next();
};
