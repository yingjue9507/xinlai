# 心来后端API文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

## 认证说明

除了登录相关接口外，所有API都需要在请求头中携带JWT Token：

```
Authorization: Bearer <your_jwt_token>
```

---

## 1. 认证模块 (`/api/auth`)

### 1.1 发送验证码

**接口**: `POST /api/auth/send-code`

**请求体**:
```json
{
  "phoneNumber": "13800138000"
}
```

**响应**:
```json
{
  "success": true,
  "message": "验证码已发送",
  "data": {
    "code": "123456"  // 仅开发环境返回
  }
}
```

### 1.2 登录/注册

**接口**: `POST /api/auth/login`

**请求体**:
```json
{
  "phoneNumber": "13800138000",
  "verificationCode": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "mock-user-13800138000",
      "phoneNumber": "13800138000",
      "registrationDate": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 2. 礼簿模块 (`/api/ledgers`)

### 2.1 获取首页统计数据

**接口**: `GET /api/ledgers/home-stats`

**响应**:
```json
{
  "success": true,
  "data": {
    "totalReceived": 50000,
    "totalGiven": 30000,
    "balance": 20000,
    "ledgers": [
      {
        "id": "ledger-123",
        "name": "我的婚礼",
        "type": "我办事",
        "occasion": "婚嫁",
        "totalAmount": 50000,
        "recordCount": 128,
        "creationDate": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 2.2 获取礼簿列表

**接口**: `GET /api/ledgers`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ledger-123",
      "name": "我的婚礼",
      "type": "我办事",
      "occasion": "婚嫁",
      "creationDate": "2024-01-01T00:00:00.000Z",
      "totalRecords": 128,
      "totalAmount": 50000,
      "averageAmount": 390
    }
  ]
}
```

### 2.3 获取礼簿详情

**接口**: `GET /api/ledgers/:id`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "ledger-123",
    "userId": "mock-user-13800138000",
    "ledgerName": "我的婚礼",
    "ledgerType": "我办事",
    "occasion": "婚嫁",
    "creationDate": "2024-01-01T00:00:00.000Z",
    "records": [
      {
        "id": "record-456",
        "ledgerId": "ledger-123",
        "contactName": "张三",
        "amount": 500,
        "isGiftItem": false,
        "note": "现金红包",
        "recordDate": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalRecords": 128,
    "totalAmount": 50000,
    "averageAmount": 390
  }
}
```

### 2.4 创建礼簿

**接口**: `POST /api/ledgers`

**请求体**:
```json
{
  "ledgerName": "我的婚礼",
  "ledgerType": "我办事",
  "occasion": "婚嫁"
}
```

**字段说明**:
- `ledgerType`: 必须是 "我办事" 或 "去随礼"
- `occasion`: 必须是 "婚嫁"、"满月"、"乔迁"、"生日"、"白事"、"其他" 之一

**响应**:
```json
{
  "success": true,
  "message": "礼簿创建成功",
  "data": {
    "id": "ledger-123",
    "userId": "mock-user-13800138000",
    "ledgerName": "我的婚礼",
    "ledgerType": "我办事",
    "occasion": "婚嫁",
    "creationDate": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.5 更新礼簿

**接口**: `PUT /api/ledgers/:id`

**请求体**:
```json
{
  "ledgerName": "我的婚礼（已更新）",
  "ledgerType": "我办事",
  "occasion": "婚嫁"
}
```

**响应**:
```json
{
  "success": true,
  "message": "礼簿更新成功",
  "data": {
    "id": "ledger-123",
    "ledgerName": "我的婚礼（已更新）",
    "ledgerType": "我办事",
    "occasion": "婚嫁"
  }
}
```

### 2.6 删除礼簿

**接口**: `DELETE /api/ledgers/:id`

**响应**:
```json
{
  "success": true,
  "message": "礼簿删除成功",
  "data": {
    "deletedLedgerId": "ledger-123",
    "deletedRecordsCount": 128
  }
}
```

---

## 3. 记录模块 (`/api/records`)

### 3.1 添加单条记录

**接口**: `POST /api/records`

**请求体**:
```json
{
  "ledgerId": "ledger-123",
  "contactName": "张三",
  "amount": 500,
  "isGiftItem": false,
  "giftDescription": "",
  "note": "现金红包",
  "recordDate": "2024-01-01"
}
```

**响应**:
```json
{
  "success": true,
  "message": "记录添加成功",
  "data": {
    "id": "record-456",
    "ledgerId": "ledger-123",
    "contactName": "张三",
    "amount": 500,
    "isGiftItem": false,
    "note": "现金红包",
    "recordDate": "2024-01-01T00:00:00.000Z",
    "creationDate": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3.2 批量导入记录

**接口**: `POST /api/records/batch`

**请求体**:
```json
{
  "ledgerId": "ledger-123",
  "records": [
    {
      "contactName": "张三",
      "amount": 500,
      "note": "现金红包",
      "recordDate": "2024-01-01"
    },
    {
      "contactName": "李四",
      "amount": 300,
      "note": "转账",
      "recordDate": "2024-01-02"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "message": "成功导入 2 条记录",
  "data": {
    "count": 2,
    "records": [...]
  }
}
```

### 3.3 更新记录

**接口**: `PUT /api/records/:id`

**请求体**:
```json
{
  "contactName": "张三",
  "amount": 600,
  "note": "现金红包（已更新）",
  "recordDate": "2024-01-01"
}
```

**响应**:
```json
{
  "success": true,
  "message": "记录更新成功",
  "data": {
    "id": "record-456",
    "contactName": "张三",
    "amount": 600,
    "note": "现金红包（已更新）"
  }
}
```

### 3.4 删除记录

**接口**: `DELETE /api/records/:id`

**响应**:
```json
{
  "success": true,
  "message": "记录删除成功",
  "data": {
    "deletedRecordId": "record-456"
  }
}
```

---

## 4. 联系人模块 (`/api/contacts`)

### 4.1 获取联系人列表

**接口**: `GET /api/contacts`

**查询参数**:
- `search`: 搜索关键词（可选）

**示例**: `GET /api/contacts?search=张`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "title": "Z",
      "data": [
        {
          "id": "contact-123",
          "name": "张三",
          "phoneNumber": "13800138000",
          "totalReceived": 2000,
          "totalGiven": 1500,
          "balance": 500,
          "lastContactDate": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### 4.2 获取联系人详情

**接口**: `GET /api/contacts/:id`

**响应**:
```json
{
  "success": true,
  "data": {
    "contact": {
      "id": "contact-123",
      "name": "张三",
      "phoneNumber": "13800138000",
      "totalReceived": 2000,
      "totalGiven": 1500,
      "balance": 500
    },
    "records": [
      {
        "id": "record-456",
        "ledgerName": "我的婚礼",
        "occasion": "婚嫁",
        "ledgerType": "我办事",
        "amount": 500,
        "note": "现金红包",
        "recordDate": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 5. 通知模块 (`/api/notifications`)

### 5.1 获取通知模板

**接口**: `GET /api/notifications/templates`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "tpl-1",
      "templateName": "婚宴邀请",
      "templateContent": "亲爱的{联系人},我将于{日期}在{地点}举办婚礼,诚挚邀请您出席见证!",
      "templateType": "婚嫁"
    }
  ]
}
```

### 5.2 发送通知

**接口**: `POST /api/notifications/send`

**请求体**:
```json
{
  "recipients": [
    {
      "name": "张三",
      "phoneNumber": "13800138000"
    }
  ],
  "message": "亲爱的张三,我将于2024年1月1日在XX酒店举办婚礼,诚挚邀请您出席见证!",
  "ledgerId": "ledger-123"
}
```

**响应**:
```json
{
  "success": true,
  "message": "成功发送 1 条通知(模拟)",
  "data": {
    "id": "log-789",
    "userId": "mock-user-13800138000",
    "ledgerId": "ledger-123",
    "sendTime": "2024-01-01T00:00:00.000Z",
    "recipientCount": 1,
    "messageContentSummary": "亲爱的张三,我将于2024年1月1日...",
    "status": "success"
  }
}
```

### 5.3 获取群发记录

**接口**: `GET /api/notifications/logs`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log-789",
      "userId": "mock-user-13800138000",
      "ledgerId": "ledger-123",
      "sendTime": "2024-01-01T00:00:00.000Z",
      "recipientCount": 1,
      "messageContentSummary": "亲爱的张三,我将于2024年1月1日...",
      "status": "success",
      "ledger": {
        "ledgerName": "我的婚礼"
      }
    }
  ]
}
```

---

## 6. 导出模块 (`/api/export`)

### 6.1 导出单个礼簿

**接口**: `POST /api/export/ledger/:id`

**响应**: Excel文件下载

**文件名**: `{礼簿名称}_{日期}.xlsx`

### 6.2 导出所有礼簿

**接口**: `POST /api/export/all-ledgers`

**响应**: Excel文件下载（多个工作表）

**文件名**: `心来礼簿导出_{日期}.xlsx`

### 6.3 导出联系人

**接口**: `POST /api/export/contacts`

**响应**: Excel文件下载

**文件名**: `心来联系人导出_{日期}.xlsx`

### 6.4 导出统计报表

**接口**: `POST /api/export/statistics`

**响应**: Excel文件下载（包含总体统计、礼簿统计、联系人统计）

**文件名**: `心来统计报表_{日期}.xlsx`

---

## 7. 用户模块 (`/api/user`)

### 7.1 获取用户信息

**接口**: `GET /api/user/profile`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "mock-user-13800138000",
    "phoneNumber": "13800138000",
    "registrationDate": "2024-01-01T00:00:00.000Z",
    "lastLoginDate": "2024-01-01T00:00:00.000Z"
  }
}
```

### 7.2 更新用户信息

**接口**: `PUT /api/user/profile`

**请求体**:
```json
{
  "nickname": "小明",
  "avatar": "https://example.com/avatar.jpg"
}
```

**响应**:
```json
{
  "success": true,
  "message": "用户信息更新成功",
  "data": {
    "id": "mock-user-13800138000",
    "nickname": "小明",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

### 7.3 验证原手机号

**接口**: `POST /api/user/verify-phone`

**请求体**:
```json
{
  "verificationCode": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "验证成功",
  "data": {
    "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 7.4 换绑新手机号

**接口**: `POST /api/user/change-phone`

**请求体**:
```json
{
  "newPhoneNumber": "13900139000",
  "verificationCode": "123456",
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应**:
```json
{
  "success": true,
  "message": "手机号换绑成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "mock-user-13900139000",
      "phoneNumber": "13900139000",
      "registrationDate": "2024-01-01T00:00:00.000Z",
      "lastLoginDate": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 错误响应格式

所有错误响应都遵循以下格式：

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

### 常见错误码

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未提供认证令牌或令牌无效
- `403 Forbidden`: 无权限访问
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

---

## 开发环境说明

### 测试账号

- 手机号: `13800138000`
- 验证码: 任意6位数字（开发环境下）

### 注意事项

1. 当前使用内存模拟数据，服务重启后数据会丢失
2. 短信验证码在开发环境下会直接返回
3. 所有时间字段使用ISO 8601格式
4. 金额字段使用数字类型，单位为元

---

**最后更新**: 2024-01-01  
**版本**: v1.0.0
