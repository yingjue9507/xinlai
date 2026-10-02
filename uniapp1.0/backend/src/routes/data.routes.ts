import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const normalizeHeader = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, '');

const cell = (row: Record<string, unknown>, names: string[]): unknown => {
  const wanted = names.map(normalizeHeader);
  const entry = Object.entries(row).find(([key]) => wanted.includes(normalizeHeader(key)));
  return entry?.[1];
};

const text = (value: unknown): string => String(value ?? '').trim();

const parseAmount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const cleaned = text(value).replace(/[¥￥,，\s]/g, '');
  if (!cleaned) return 0;
  return Number(cleaned);
};

const parseBoolean = (value: unknown): boolean => {
  const normalized = text(value).toLowerCase();
  return ['1', 'true', 'yes', 'y', '是', '物品', '礼物'].includes(normalized);
};

const parseRecordType = (value: unknown): 'received' | 'sent' => {
  const normalized = text(value).toLowerCase();
  return ['sent', 'send', 'given', '送', '送出', '送礼', '给', '支出'].includes(normalized)
    ? 'sent'
    : 'received';
};

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
  }
  const source = text(value);
  if (!source) return null;
  const normalized = source.replace(/[年./]/g, '-').replace(/月/g, '-').replace(/日/g, '');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateLabel = (value: Date): string => value.toISOString().slice(0, 10);

router.use(authMiddleware);

// 导出当前账号的真实礼簿数据。导出表的第一张表可直接再次导入。
router.post('/all-ledgers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError('登录状态无效', 401);

    const ledgers = await prisma.ledger.findMany({
      where: { userId },
      include: { records: { orderBy: { recordDate: 'asc' } } },
      orderBy: { creationDate: 'asc' }
    });

    if (!ledgers.length) throw new AppError('暂无可导出的礼簿数据', 404);

    const detailRows = ledgers.flatMap((ledger) => ledger.records.map((record) => ({
      礼簿名称: ledger.ledgerName,
      礼簿方向: ledger.ledgerType,
      事情类型: ledger.occasion,
      联系人: record.contactName,
      收送: record.recordType === 'sent' ? '送出' : '收到',
      金额: Number(record.amount),
      是否物品: record.isGiftItem ? '是' : '否',
      物品描述: record.giftDescription || '',
      备注: record.note || '',
      日期: dateLabel(record.recordDate)
    })));

    const summaryRows = ledgers.map((ledger) => ({
      礼簿名称: ledger.ledgerName,
      礼簿方向: ledger.ledgerType,
      事情类型: ledger.occasion,
      记录数: ledger.records.length,
      收礼合计: ledger.records.filter((record) => record.recordType !== 'sent').reduce((sum, record) => sum + Number(record.amount), 0),
      送礼合计: ledger.records.filter((record) => record.recordType === 'sent').reduce((sum, record) => sum + Number(record.amount), 0)
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), '礼簿明细');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), '礼簿汇总');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.status(200);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''xinlai-ledgers-${dateLabel(new Date())}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// 导入 xlsx、xls 或 csv。按“礼簿明细”格式校验，礼簿不存在时自动创建。
router.post('/import', upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError('登录状态无效', 401);
    if (!req.file) throw new AppError('请选择要导入的 Excel 文件', 400);

    const extension = req.file.originalname.toLowerCase().split('.').pop();
    if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
      throw new AppError('仅支持 .xlsx、.xls 或 .csv 文件', 400);
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames.includes('礼簿明细') ? '礼簿明细' : workbook.SheetNames[0];
    if (!sheetName) throw new AppError('Excel 文件没有可读取的工作表', 400);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
    if (!rows.length) throw new AppError('Excel 文件中没有明细数据', 400);

    const requiredHeaders = ['礼簿名称', '联系人', '金额'];
    const availableHeaders = Object.keys(rows[0]).map(normalizeHeader);
    const missingHeader = requiredHeaders.find((header) => !availableHeaders.includes(header));
    if (missingHeader) throw new AppError(`Excel 缺少必要列：${missingHeader}`, 400);

    const prepared = rows.map((row, index) => {
      const ledgerName = text(cell(row, ['礼簿名称', '礼簿']));
      const contactName = text(cell(row, ['联系人', '姓名', '往来人']));
      const giftItem = parseBoolean(cell(row, ['是否物品', '物品']));
      const amount = parseAmount(cell(row, ['金额', '数额']));
      const recordDate = parseDate(cell(row, ['日期', '记录日期', '时间'])) || new Date();

      if (!ledgerName) throw new AppError(`第 ${index + 2} 行缺少礼簿名称`, 400);
      if (!contactName) throw new AppError(`第 ${index + 2} 行缺少联系人`, 400);
      if (!giftItem && (!Number.isFinite(amount) || amount < 0)) throw new AppError(`第 ${index + 2} 行金额无效`, 400);

      return {
        ledgerName,
        ledgerType: text(cell(row, ['礼簿方向', '礼簿类型'])) || '我办事',
        occasion: text(cell(row, ['事情类型', '事由'])) || '其他',
        contactName,
        amount: giftItem ? 0 : amount,
        isGiftItem: giftItem,
        giftDescription: text(cell(row, ['物品描述', '物品名称'])) || null,
        note: text(cell(row, ['备注', '说明'])) || null,
        recordDate,
        recordType: parseRecordType(cell(row, ['收送', '记录类型', '方向']))
      };
    });

    let createdLedgers = 0;
    await prisma.$transaction(async (tx) => {
      const ledgerCache = new Map<string, { id: string }>();
      for (const item of prepared) {
        let ledger = ledgerCache.get(item.ledgerName);
        if (!ledger) {
          const existing = await tx.ledger.findFirst({ where: { userId, ledgerName: item.ledgerName } });
          if (existing) {
            ledger = { id: existing.id };
          } else {
            const created = await tx.ledger.create({
              data: {
                userId,
                ledgerName: item.ledgerName,
                ledgerType: item.ledgerType,
                occasion: item.occasion
              }
            });
            ledger = { id: created.id };
            createdLedgers += 1;
          }
          ledgerCache.set(item.ledgerName, ledger);
        }

        await tx.record.create({
          data: {
            ledgerId: ledger.id,
            contactName: item.contactName,
            amount: item.amount,
            isGiftItem: item.isGiftItem,
            giftDescription: item.giftDescription,
            note: item.note,
            recordDate: item.recordDate,
            recordType: item.recordType
          }
        });
      }
    });

    res.json({
      success: true,
      message: `成功导入 ${prepared.length} 条记录`,
      data: { importedRecords: prepared.length, createdLedgers }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
