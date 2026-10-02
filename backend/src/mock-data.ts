// 无数据库模式 - 模拟数据存储(内存)

export interface MockUser {
  id: string;
  phoneNumber: string;
  registrationDate: Date;
  lastLoginDate: Date;
}

export interface MockLedger {
  id: string;
  userId: string;
  ledgerName: string;
  ledgerType: string;
  occasion: string;
  creationDate: Date;
}

export interface MockRecord {
  id: string;
  ledgerId: string;
  contactName: string;
  amount: number;
  isGiftItem: boolean;
  giftDescription?: string;
  note?: string;
  recordDate: Date;
  creationDate: Date;
}

export interface MockContact {
  id: string;
  userId: string;
  contactName: string;
  phoneNumber?: string;
  totalReceived: number;
  totalGiven: number;
  lastContactDate: Date;
}

export interface MockNotificationTemplate {
  id: string;
  templateName: string;
  templateContent: string;
  templateType: string;
}

export interface MockMassSendLog {
  id: string;
  userId: string;
  ledgerId?: string;
  sendTime: Date;
  recipientCount: number;
  messageContentSummary: string;
  status: string;
}

// 内存存储
export const mockUsers: MockUser[] = [];
export const mockLedgers: MockLedger[] = [];
export const mockRecords: MockRecord[] = [];
export const mockContacts: MockContact[] = [];
export const mockNotificationTemplates: MockNotificationTemplate[] = [];
export const mockMassSendLogs: MockMassSendLog[] = [];

// 添加一些测试数据（用于演示）
mockLedgers.push(
  {
    id: 'ledger-demo-1',
    userId: 'mock-user-13800138000',
    ledgerName: '我的婚礼',
    ledgerType: '我办事',
    occasion: '婚嫁',
    creationDate: new Date('2024-01-01')
  },
  {
    id: 'ledger-demo-2',
    userId: 'mock-user-13800138000',
    ledgerName: '张三的生日',
    ledgerType: '去随礼',
    occasion: '生日',
    creationDate: new Date('2024-01-15')
  }
);

// 初始化示例模板
mockNotificationTemplates.push(
  {
    id: 'tpl-1',
    templateName: '婚宴邀请',
    templateContent: '亲爱的{联系人},我将于{日期}在{地点}举办婚礼,诚挚邀请您出席见证!',
    templateType: '婚嫁'
  },
  {
    id: 'tpl-2',
    templateName: '满月酒邀请',
    templateContent: '{联系人}您好,小儿满月之喜,特设薄宴于{日期}{地点},恭候光临!',
    templateType: '满月'
  },
  {
    id: 'tpl-3',
    templateName: '乔迁之喜',
    templateContent: '{联系人},搬新家啦!{日期}在{地点}举办乔迁宴,期待您的到来!',
    templateType: '乔迁'
  }
);
