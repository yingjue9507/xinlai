import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const OCR_ROOT = path.resolve(__dirname, '../../uploads/ocr-drafts');
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const imageExtension = (mimetype: string): string => {
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  return '.jpg';
};

const uploadImage = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('image')(req, res, (error: unknown) => {
    if (!error) return next();
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('图片不能超过 10MB', 400));
    }
    return next(new AppError('图片上传失败，请重新选择常见图片格式', 400));
  });
};

type NormalizedOcrRow = {
  contactName: string;
  amount: number;
  isGiftItem: boolean;
  giftDescription: string | null;
  note: string | null;
  recordDate: Date;
  recordType: 'received' | 'sent';
  needsReview: boolean;
  reviewNote: string | null;
};

class OcrProcessingError extends Error {
  constructor(public pageId: string, message: string) { super(message); }
}

const cleanText = (value: unknown): string => String(value ?? '').trim();

const parseAmount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const cleaned = cleanText(value).replace(/[¥￥,，\s]/g, '');
  if (!cleaned) return 0;
  return Number(cleaned);
};

const parseBoolean = (value: unknown): boolean => ['true', '1', 'yes', 'y', '是', '物品', '礼物'].includes(cleanText(value).toLowerCase());

const normalizeRecordType = (value: unknown, ledgerType: string): 'received' | 'sent' => {
  const normalized = cleanText(value).toLowerCase();
  if (['sent', 'send', 'given', '送', '送出', '送礼', '给', '支出'].includes(normalized)) return 'sent';
  if (['received', 'receive', '收到', '收礼', '收入'].includes(normalized)) return 'received';
  return ledgerType === '参加别人的事' || ledgerType === 'given' ? 'sent' : 'received';
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const source = cleanText(value);
  if (!source) return null;
  const normalized = source.replace(/[年./]/g, '-').replace(/月/g, '-').replace(/日/g, '');
  const parsed = new Date(/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized) ? `${normalized}T00:00:00` : normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const pageFile = (relativePath: string): string => {
  const root = `${OCR_ROOT}${path.sep}`;
  const resolved = path.resolve(OCR_ROOT, relativePath);
  if (!resolved.startsWith(root)) throw new AppError('OCR 图片路径无效', 400);
  return resolved;
};

const removeSessionFiles = async (sessionId: string, userId: string): Promise<void> => {
  await rm(path.join(OCR_ROOT, userId, sessionId), { recursive: true, force: true });
};

const ensureDraftSession = async (userId: string, sessionId: string) => {
  const session = await prisma.ocrSession.findFirst({ where: { id: sessionId, userId }, include: { ledger: true } });
  if (!session) throw new AppError('OCR 批次不存在或无权访问', 404);
  if (session.status !== 'draft') throw new AppError('OCR 批次已经完成或已失效', 409);
  if (session.expiresAt < new Date()) throw new AppError('OCR 草稿已过期，请重新开始', 410);
  return session;
};

const extractModelText = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((item) => typeof item === 'string' ? item : cleanText((item as { text?: unknown }).text)).join('');
  return '';
};

const parseModelResult = (content: string): Record<string, unknown> => {
  const jsonText = content.replace(/```json\s*|```/gi, '').trim();
  try {
    return JSON.parse(jsonText || '{}') as Record<string, unknown>;
  } catch {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(jsonText.slice(start, end + 1)) as Record<string, unknown>;
    throw new AppError('无法解析 AI 识别结果，请重试', 502);
  }
};

const recognizeImage = async (buffer: Buffer, mimetype: string, ledgerType: string) => {
  const endpointId = process.env.VOLC_ENDPOINT_ID;
  const apiKey = process.env.VOLC_API_KEY;
  if (!endpointId || !apiKey) throw new AppError('后端未配置 OCR 模型，请联系开发者', 503);
  const dataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;
  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: endpointId,
      messages: [{ role: 'user', content: [
        { type: 'text', text: `你是手写礼簿识别助手。请识别整页中的所有人情记录，只返回严格 JSON，不要 Markdown。格式为 {"list":[{"contactName":"姓名","amount":数字,"isGift":false,"giftDescription":"","note":"备注","date":"YYYY-MM-DD","recordType":"received"}]}。无法确定的字段保留空字符串或 0。当前礼簿方向是“${ledgerType}”，未明确写出收送方向时按该方向推断。不要把页码、合计、标题识别成记录。` },
        { type: 'image_url', image_url: { url: dataUrl } }
      ] }]
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('OCR provider error:', response.status, detail.slice(0, 500));
    if (response.status === 404) throw new AppError('火山视觉模型接入点不存在，请将 VOLC_ENDPOINT_ID 配置为已部署的 ep- 接入点', 503);
    if (response.status === 401 || response.status === 403) throw new AppError('火山视觉模型鉴权失败，请检查 VOLC_API_KEY', 503);
    throw new AppError('AI 识别服务暂时不可用，请稍后重试', 502);
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = extractModelText(data.choices?.[0]?.message?.content);
  return { parsed: parseModelResult(content), raw: data };
};

const normalizeRows = (parsed: Record<string, unknown>, ledgerType: string): NormalizedOcrRow[] => {
  const rawList = Array.isArray(parsed.list) ? parsed.list : Array.isArray(parsed.records) ? parsed.records : [];
  return rawList.map((item: unknown) => {
    const value = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const contactName = cleanText(value.contactName ?? value.name ?? value.person);
    const isGiftItem = parseBoolean(value.isGift ?? value.isGiftItem ?? value.gift);
    const amount = isGiftItem ? 0 : parseAmount(value.amount ?? value.money ?? value.value);
    const recordDate = parseDate(value.date ?? value.recordDate);
    const warnings: string[] = [];
    if (!contactName) warnings.push('缺少联系人');
    if (!isGiftItem && (!Number.isFinite(amount) || amount <= 0)) warnings.push('金额需要确认');
    if (!recordDate) warnings.push('日期需要确认');
    return {
      contactName,
      amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
      isGiftItem,
      giftDescription: cleanText(value.giftDescription ?? value.itemDescription ?? (isGiftItem ? value.note : '')) || null,
      note: cleanText(value.note) || null,
      recordDate: recordDate || new Date(),
      recordType: normalizeRecordType(value.recordType ?? value.direction ?? value.type, ledgerType),
      needsReview: warnings.length > 0,
      reviewNote: warnings.length ? warnings.join('、') : null
    };
  });
};

const serializeRow = (row: any) => ({ id: row.id, rowIndex: row.rowIndex, contactName: row.contactName, amount: Number(row.amount), isGiftItem: row.isGiftItem, giftDescription: row.giftDescription, note: row.note, recordDate: row.recordDate, recordType: row.recordType, needsReview: row.needsReview, reviewNote: row.reviewNote });

const serializeSession = (session: any) => ({
  id: session.id,
  ledgerId: session.ledgerId,
  ledgerName: session.ledger?.ledgerName,
  ledgerType: session.ledger?.ledgerType,
  occasion: session.ledger?.occasion,
  status: session.status,
  expiresAt: session.expiresAt,
  pages: (session.pages || []).map((page: any) => ({ id: page.id, pageNumber: page.pageNumber, status: page.status, errorMessage: page.errorMessage, imageAvailable: true, rows: (page.rows || []).map(serializeRow) }))
});

const loadSession = (id: string, userId: string) => prisma.ocrSession.findFirst({
  where: { id, userId },
  include: { ledger: true, pages: { orderBy: { pageNumber: 'asc' }, include: { rows: { orderBy: { rowIndex: 'asc' } } } } }
});

const updateContacts = async (userId: string, contactNames: string[]) => {
  for (const contactName of [...new Set(contactNames.filter(Boolean))]) {
    const records = await prisma.record.findMany({ where: { contactName, ledger: { userId } } });
    let totalReceived = 0;
    let totalGiven = 0;
    let lastContactDate = new Date(0);
    for (const record of records) {
      if (record.recordDate > lastContactDate) lastContactDate = record.recordDate;
      if (!record.isGiftItem && record.recordType === 'received') totalReceived += record.amount;
      if (!record.isGiftItem && record.recordType === 'sent') totalGiven += record.amount;
    }
    await prisma.contact.upsert({
      where: { userId_contactName: { userId, contactName } },
      update: { totalReceived, totalGiven, lastContactDate, updatedAt: new Date() },
      create: { userId, contactName, totalReceived, totalGiven, lastContactDate }
    });
  }
};

const saveAnalyzedPage = async (pageId: string, userId: string, buffer: Buffer, mimetype: string) => {
  const page = await prisma.ocrPage.findFirst({ where: { id: pageId, session: { userId } }, include: { session: { include: { ledger: true } } } });
  if (!page) throw new AppError('OCR 页面不存在或无权访问', 404);
  try {
    const result = await recognizeImage(buffer, mimetype, page.session.ledger.ledgerType);
    const rows = normalizeRows(result.parsed, page.session.ledger.ledgerType);
    await prisma.$transaction(async (tx) => {
      await tx.ocrRow.deleteMany({ where: { pageId } });
      if (rows.length) await tx.ocrRow.createMany({ data: rows.map((row, rowIndex) => ({ ...row, pageId, rowIndex })) });
      await tx.ocrPage.update({ where: { id: pageId }, data: { status: rows.length ? 'ready' : 'failed', rawResponse: JSON.stringify(result.raw), errorMessage: rows.length ? null : '未识别到有效记录' } });
    });
    return rows;
  } catch (error) {
    await prisma.ocrPage.update({ where: { id: pageId }, data: { status: 'failed', errorMessage: error instanceof Error ? error.message : '识别失败' } });
    throw new OcrProcessingError(pageId, error instanceof Error ? error.message : '识别失败');
  }
};

router.use(authMiddleware);

router.post('/sessions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const ledger = await prisma.ledger.findFirst({ where: { id: req.body.ledgerId, userId } });
    if (!ledger) throw new AppError('请选择有效的礼簿', 400);
    const session = await prisma.ocrSession.create({ data: { userId, ledgerId: ledger.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    res.json({ success: true, data: { id: session.id, ledgerId: ledger.id, ledgerName: ledger.ledgerName, expiresAt: session.expiresAt } });
  } catch (error) { next(error); }
});

router.get('/sessions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await ensureDraftSession(req.userId!, req.params.id);
    const full = await loadSession(session.id, req.userId!);
    return res.json({ success: true, data: serializeSession(full) });
  } catch (error) { return next(error); }
});

router.post('/sessions/:id/pages', uploadImage, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const session = await ensureDraftSession(userId, req.params.id);
    if (!req.file || !ALLOWED_MIME_TYPES.has(req.file.mimetype)) throw new AppError('请上传 JPG、PNG 或 WebP 图片', 400);
    const pageNumber = (await prisma.ocrPage.count({ where: { sessionId: session.id } })) + 1;
    const relativePath = path.join(userId, session.id, `${String(pageNumber).padStart(4, '0')}-${randomUUID()}${imageExtension(req.file.mimetype)}`);
    const absolutePath = pageFile(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, req.file.buffer);
    const page = await prisma.ocrPage.create({ data: { sessionId: session.id, pageNumber, imagePath: relativePath, status: 'processing' } });
    try {
      await saveAnalyzedPage(page.id, userId, req.file.buffer, req.file.mimetype);
    } catch (error) {
      if (error instanceof OcrProcessingError) return res.status(422).json({ success: false, message: error.message, data: { pageId: error.pageId } });
      throw error;
    }
    const full = await loadSession(session.id, userId);
    return res.json({ success: true, data: serializeSession(full) });
  } catch (error) { return next(error); }
});

router.post('/pages/:id/retry', uploadImage, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = await prisma.ocrPage.findFirst({ where: { id: req.params.id, session: { userId: req.userId! } }, include: { session: true } });
    if (!page) throw new AppError('OCR 页面不存在或无权访问', 404);
    await ensureDraftSession(req.userId!, page.sessionId);
    if (!req.file || !ALLOWED_MIME_TYPES.has(req.file.mimetype)) throw new AppError('请上传 JPG、PNG 或 WebP 图片', 400);
    const oldPath = pageFile(page.imagePath);
    const relativePath = path.join(req.userId!, page.sessionId, `${String(page.pageNumber).padStart(4, '0')}-${randomUUID()}${imageExtension(req.file.mimetype)}`);
    const newPath = pageFile(relativePath);
    await mkdir(path.dirname(newPath), { recursive: true });
    await writeFile(newPath, req.file.buffer);
    await prisma.ocrPage.update({ where: { id: page.id }, data: { imagePath: relativePath, status: 'processing', errorMessage: null } });
    await rm(oldPath, { force: true });
    try {
      await saveAnalyzedPage(page.id, req.userId!, req.file.buffer, req.file.mimetype);
    } catch (error) {
      if (error instanceof OcrProcessingError) return res.status(422).json({ success: false, message: error.message, data: { pageId: error.pageId } });
      throw error;
    }
    const full = await loadSession(page.sessionId, req.userId!);
    return res.json({ success: true, data: serializeSession(full) });
  } catch (error) { return next(error); }
});

router.get('/pages/:id/image', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = await prisma.ocrPage.findFirst({ where: { id: req.params.id, session: { userId: req.userId! } } });
    if (!page) throw new AppError('OCR 图片不存在或无权访问', 404);
    res.sendFile(pageFile(page.imagePath), (error) => { if (error && !res.headersSent) next(error); });
  } catch (error) { next(error); }
});

router.put('/pages/:pageId/rows/:rowId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.ocrRow.findFirst({ where: { id: req.params.rowId, pageId: req.params.pageId, page: { session: { userId: req.userId!, status: 'draft' } } }, include: { page: { include: { session: { include: { ledger: true } } } } } });
    if (!row) throw new AppError('识别记录不存在或无权访问', 404);
    const contactName = cleanText(req.body.contactName);
    const isGiftItem = Boolean(req.body.isGiftItem);
    const amount = isGiftItem ? 0 : parseAmount(req.body.amount);
    const recordDate = parseDate(req.body.recordDate);
    if (!contactName) throw new AppError('联系人不能为空', 400);
    if (!isGiftItem && (!Number.isFinite(amount) || amount < 0)) throw new AppError('金额格式不正确', 400);
    if (!recordDate) throw new AppError('日期格式不正确', 400);
    const needsReview = !isGiftItem && amount <= 0;
    const updated = await prisma.ocrRow.update({ where: { id: row.id }, data: { contactName, amount, isGiftItem, giftDescription: cleanText(req.body.giftDescription) || null, note: cleanText(req.body.note) || null, recordDate, recordType: normalizeRecordType(req.body.recordType, row.page.session.ledger.ledgerType), needsReview, reviewNote: needsReview ? '金额需要确认' : null } });
    res.json({ success: true, data: serializeRow(updated) });
  } catch (error) { next(error); }
});

router.post('/sessions/:id/confirm', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const session = await ensureDraftSession(userId, req.params.id);
    const full = await loadSession(session.id, userId);
    const pages = full?.pages || [];
    const rows = pages.flatMap((page: any) => page.rows || []);
    if (!rows.length) throw new AppError('当前批次没有可导入的记录', 400);
    if (pages.some((page: any) => page.status !== 'ready')) throw new AppError('仍有页面识别失败，请重试或删除后再确认', 400);
    if (rows.some((row: any) => row.needsReview || !row.contactName || (!row.isGiftItem && row.amount <= 0))) throw new AppError('请先处理标红的识别记录', 400);
    await prisma.$transaction(async (tx) => {
      await tx.record.createMany({ data: rows.map((row: any) => ({ ledgerId: session.ledgerId, contactName: row.contactName, amount: row.isGiftItem ? 0 : Number(row.amount), isGiftItem: row.isGiftItem, giftDescription: row.giftDescription, note: row.note, recordDate: row.recordDate, recordType: row.recordType })) });
      await tx.ocrSession.update({ where: { id: session.id }, data: { status: 'confirmed' } });
    });
    await updateContacts(userId, rows.map((row: any) => row.contactName));
    await removeSessionFiles(session.id, userId);
    res.json({ success: true, message: `已导入 ${rows.length} 条记录`, data: { recordCount: rows.length, pageCount: pages.length } });
  } catch (error) { next(error); }
});

router.delete('/sessions/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await ensureDraftSession(req.userId!, req.params.id);
    await prisma.ocrSession.delete({ where: { id: session.id } });
    await removeSessionFiles(session.id, req.userId!);
    res.json({ success: true, message: 'OCR 草稿已删除' });
  } catch (error) { next(error); }
});

router.post('/analyze', uploadImage, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file || !ALLOWED_MIME_TYPES.has(req.file.mimetype)) throw new AppError('请上传 JPG、PNG 或 WebP 图片', 400);
    const result = await recognizeImage(req.file.buffer, req.file.mimetype, cleanText(req.body.ledgerType) || '我办事');
    res.json({ success: true, data: result.parsed });
  } catch (error) { next(error); }
});

export async function cleanupExpiredOcrSessions(): Promise<void> {
  const expired = await prisma.ocrSession.findMany({ where: { status: 'draft', expiresAt: { lt: new Date() } }, select: { id: true, userId: true } });
  for (const session of expired) {
    await prisma.ocrSession.delete({ where: { id: session.id } });
    await removeSessionFiles(session.id, session.userId);
  }
}

const cleanupTimer = setInterval(() => cleanupExpiredOcrSessions().catch((error) => console.error('OCR cleanup failed', error)), 6 * 60 * 60 * 1000);
cleanupTimer.unref?.();
void cleanupExpiredOcrSessions().catch((error) => console.error('OCR cleanup failed', error));

export default router;
