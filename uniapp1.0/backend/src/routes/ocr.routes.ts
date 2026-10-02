import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', authMiddleware, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('请上传图片', 400);
    }

    const base64Image = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // 获取配置
    const endpointId = process.env.VOLC_ENDPOINT_ID;
    const apiKey = process.env.VOLC_API_KEY;

    if (!endpointId) {
      throw new AppError('未配置模型接入点 ID (VOLC_ENDPOINT_ID)，请在后端 .env 文件中配置', 500);
    }
    if (!apiKey) {
      throw new AppError('未配置 API Key (VOLC_API_KEY)，请在后端 .env 文件中配置', 500);
    }

    console.log('正在调用火山引擎 OCR (Direct API)...', { endpointId });

    // 构造请求体
    const payload = {
      model: endpointId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '请识别图片中的礼金记录，提取为JSON格式。如果有多条记录，请全部提取。返回格式必须是严格的JSON对象，包含一个 "list" 数组，每个元素包含: "contactName"(姓名), "amount"(金额, 数字, 如果是物品则为0), "isGift"(boolean, 是否物品), "note"(备注/物品描述), "date"(日期字符串, YYYY-MM-DD, 如果没有则为空)。不要返回Markdown代码块，只返回JSON字符串。' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    };

    // 调用 API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Volcengine API Error:', errorText);
      throw new AppError(`OCR 服务调用失败: ${response.status} ${response.statusText}`, 500);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    console.log('OCR 原始返回:', content);

    // 解析 JSON
    let result;
    try {
        // 移除可能的 markdown 代码块标记
        const jsonStr = content?.replace(/```json\n?|```/g, '').trim();
        result = JSON.parse(jsonStr || '{}');
    } catch (e) {
        console.error('JSON Parse Error:', e);
        throw new AppError('无法解析识别结果，请重试', 500);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('OCR Error:', error);
    next(error);
  }
});

export default router;
