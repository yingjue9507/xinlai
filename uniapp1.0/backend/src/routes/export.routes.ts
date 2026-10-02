import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { mockLedgers, mockRecords, mockContacts } from '../mock-data';
import * as XLSX from 'xlsx';

const router = Router();

router.use(authMiddleware);

// 导出礼簿数据为Excel
router.post('/ledger/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // 查找礼簿
    const ledger = mockLedgers.find(l => l.id === id && l.userId === userId);
    
    if (!ledger) {
      throw new AppError('礼簿不存在或无权限', 404);
    }

    // 获取该礼簿的所有记录
    const records = mockRecords.filter(r => r.ledgerId === id);

    // 准备Excel数据
    const excelData = records.map(record => ({
      '姓名': record.contactName,
      '金额': record.amount,
      '是否物品': record.isGiftItem ? '是' : '否',
      '物品描述': record.giftDescription || '',
      '备注': record.note || '',
      '日期': new Date(record.recordDate).toLocaleDateString('zh-CN'),
      '创建时间': new Date(record.creationDate).toLocaleString('zh-CN')
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 姓名
      { wch: 10 }, // 金额
      { wch: 10 }, // 是否物品
      { wch: 20 }, // 物品描述
      { wch: 20 }, // 备注
      { wch: 15 }, // 日期
      { wch: 20 }  // 创建时间
    ];

    XLSX.utils.book_append_sheet(wb, ws, '礼金记录');

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const fileName = `${ledger.ledgerName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
});

// 导出所有礼簿数据
router.post('/all-ledgers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 获取用户的所有礼簿
    const userLedgers = mockLedgers.filter(l => l.userId === userId);

    if (userLedgers.length === 0) {
      throw new AppError('没有可导出的礼簿', 404);
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 为每个礼簿创建一个工作表
    userLedgers.forEach(ledger => {
      const records = mockRecords.filter(r => r.ledgerId === ledger.id);
      
      const excelData = records.map(record => ({
        '姓名': record.contactName,
        '金额': record.amount,
        '是否物品': record.isGiftItem ? '是' : '否',
        '物品描述': record.giftDescription || '',
        '备注': record.note || '',
        '日期': new Date(record.recordDate).toLocaleDateString('zh-CN')
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 15 }, { wch: 10 }, { wch: 10 }, 
        { wch: 20 }, { wch: 20 }, { wch: 15 }
      ];

      // 工作表名称限制为31个字符
      const sheetName = ledger.ledgerName.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const fileName = `心来礼簿导出_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
});

// 导出联系人数据
router.post('/contacts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 获取用户的所有联系人
    const userContacts = mockContacts.filter(c => c.userId === userId);

    if (userContacts.length === 0) {
      throw new AppError('没有可导出的联系人', 404);
    }

    // 准备Excel数据
    const excelData = userContacts.map(contact => ({
      '姓名': contact.contactName,
      '电话': contact.phoneNumber || '',
      '累计收礼': contact.totalReceived,
      '累计送礼': contact.totalGiven,
      '结余': contact.totalReceived - contact.totalGiven,
      '最后往来日期': new Date(contact.lastContactDate).toLocaleDateString('zh-CN')
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 姓名
      { wch: 15 }, // 电话
      { wch: 12 }, // 累计收礼
      { wch: 12 }, // 累计送礼
      { wch: 12 }, // 结余
      { wch: 15 }  // 最后往来日期
    ];

    XLSX.utils.book_append_sheet(wb, ws, '联系人');

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const fileName = `心来联系人导出_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
});

// 导出统计报表
router.post('/statistics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // 获取用户数据
    const userLedgers = mockLedgers.filter(l => l.userId === userId);
    const userContacts = mockContacts.filter(c => c.userId === userId);

    // 计算总体统计
    let totalReceived = 0;
    let totalGiven = 0;

    userLedgers.forEach(ledger => {
      const ledgerRecords = mockRecords.filter(r => r.ledgerId === ledger.id);
      const ledgerTotal = ledgerRecords.reduce((sum, record) => sum + record.amount, 0);

      if (ledger.ledgerType === '我办事') {
        totalReceived += ledgerTotal;
      } else {
        totalGiven += ledgerTotal;
      }
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 总体统计表
    const summaryData = [
      { '项目': '累计收礼', '金额': totalReceived },
      { '项目': '累计送礼', '金额': totalGiven },
      { '项目': '结余', '金额': totalReceived - totalGiven },
      { '项目': '礼簿总数', '金额': userLedgers.length },
      { '项目': '联系人总数', '金额': userContacts.length }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, '总体统计');

    // 礼簿统计表
    const ledgerStats = userLedgers.map(ledger => {
      const records = mockRecords.filter(r => r.ledgerId === ledger.id);
      const total = records.reduce((sum, r) => sum + r.amount, 0);
      return {
        '礼簿名称': ledger.ledgerName,
        '类型': ledger.ledgerType,
        '事由': ledger.occasion,
        '记录数': records.length,
        '总金额': total,
        '平均金额': records.length > 0 ? Math.round(total / records.length) : 0,
        '创建日期': new Date(ledger.creationDate).toLocaleDateString('zh-CN')
      };
    });
    const wsLedgers = XLSX.utils.json_to_sheet(ledgerStats);
    XLSX.utils.book_append_sheet(wb, wsLedgers, '礼簿统计');

    // 联系人统计表（按结余排序）
    const contactStats = userContacts
      .map(contact => ({
        '姓名': contact.contactName,
        '累计收礼': contact.totalReceived,
        '累计送礼': contact.totalGiven,
        '结余': contact.totalReceived - contact.totalGiven
      }))
      .sort((a, b) => b.结余 - a.结余);
    const wsContacts = XLSX.utils.json_to_sheet(contactStats);
    XLSX.utils.book_append_sheet(wb, wsContacts, '联系人统计');

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const fileName = `心来统计报表_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
